import { cfg } from "./config";
import { resolveSecret } from "./connectors";
import { audit, kvGet, kvSet } from "./db";
import { loadVault, markUsed } from "./vault";

/*
 * Avisos da Central pelo WhatsApp (Evolution API, instância do Felipe).
 * Só manda para o número do Felipe salvo na Central (nunca vai para o repositório,
 * que é público). Antes de enviar, confere connectionState = "open"; resposta
 * PENDING só quer dizer que a API aceitou, não que chegou.
 */

export const SECRET = "EVOLUTION_API_KEY";

export type WaConfig = { url: string; instancia: string; numero: string; temChave: boolean };

export async function waConfig(): Promise<WaConfig> {
  await loadVault();
  return {
    url: (await kvGet("whatsapp.url")) || process.env.CENTRAL_EVOLUTION_URL || "https://evo.madebyfelipe.agency",
    instancia: (await kvGet("whatsapp.instancia")) || "mbf",
    numero: (await kvGet("whatsapp.numero")) || "",
    temChave: Boolean(resolveSecret(SECRET))
  };
}

export async function saveWaConfig(patch: { url?: string; instancia?: string; numero?: string }): Promise<void> {
  if (patch.url !== undefined) {
    const u = new URL(patch.url.trim());
    if (u.protocol !== "https:") throw new Error("A URL da Evolution precisa ser https.");
    await kvSet("whatsapp.url", u.origin);
  }
  if (patch.instancia !== undefined) {
    if (!/^[\w-]{1,40}$/.test(patch.instancia.trim())) throw new Error("Instância: letras, números, _ e -.");
    await kvSet("whatsapp.instancia", patch.instancia.trim());
  }
  if (patch.numero !== undefined) {
    const n = patch.numero.replace(/\D/g, "");
    if (n && (n.length < 12 || n.length > 13)) throw new Error("Número com DDI e DDD, só dígitos (ex.: 5515999998888).");
    await kvSet("whatsapp.numero", n);
  }
}

async function call(path: string, init: RequestInit = {}): Promise<{ status: number; data: unknown }> {
  const c = await waConfig();
  const key = resolveSecret(SECRET);
  if (!key) throw new Error("Falta a chave da Evolution API (Apps → WhatsApp → Conectar).");
  const res = await fetch(`${c.url}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", apikey: key, ...(init.headers ?? {}) }
  });
  void markUsed(SECRET);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* sem corpo */
  }
  return { status: res.status, data };
}

/** Mesmo número, com ou sem o 9 depois do DDD. */
function sameNumber(a: string, b: string): boolean {
  const n = (x: string) => {
    const d = x.replace(/\D/g, "");
    return d.length === 13 && d.startsWith("55") ? d.slice(0, 4) + d.slice(5) : d;
  };
  return Boolean(a && b) && n(a) === n(b);
}

/**
 * O número da instância é o mesmo do destino? Então o aviso sai "de você para você":
 * a Evolution aceita, a mensagem aparece na conversa "Você", mas o WhatsApp não notifica.
 */
async function sendsToSelf(c: WaConfig): Promise<boolean> {
  if (!c.numero) return false;
  try {
    const r = await call("/instance/fetchInstances");
    const list = Array.isArray(r.data) ? (r.data as { name?: string; ownerJid?: string; instance?: { instanceName?: string; owner?: string } }[]) : [];
    const me = list.find((i) => (i.name ?? i.instance?.instanceName) === c.instancia);
    return sameNumber(String(me?.ownerJid ?? me?.instance?.owner ?? "").split("@")[0], c.numero);
  } catch {
    return false;
  }
}

export const SELF_WARNING = 'o número de destino é o mesmo da instância: a mensagem cai na conversa "Você" e o WhatsApp não notifica. Para o aviso tocar, a instância precisa ser de outro número';

export async function waState(): Promise<{ ok: boolean; state: string; detail: string; self?: boolean }> {
  try {
    const c = await waConfig();
    const r = await call(`/instance/connectionState/${encodeURIComponent(c.instancia)}`);
    const state = String((r.data as { instance?: { state?: string } } | null)?.instance?.state ?? (r.status === 401 ? "chave recusada" : `HTTP ${r.status}`));
    const self = state === "open" && (await sendsToSelf(c));
    return { ok: state === "open", state, self, detail: state !== "open" ? `estado: ${state}` : self ? `conectado, mas ${SELF_WARNING}` : "conectado" };
  } catch (e) {
    return { ok: false, state: "erro", detail: e instanceof Error ? e.message : "sem resposta" };
  }
}

/** Envia um aviso ao Felipe. Devolve se a API aceitou (PENDING não é entrega). */
export async function notifyFelipe(text: string, who = "central"): Promise<{ sent: boolean; detail: string }> {
  const c = await waConfig();
  if (!c.numero) return { sent: false, detail: "número do Felipe não configurado (Apps → WhatsApp)" };
  const st = await waState();
  if (!st.ok) return { sent: false, detail: `WhatsApp não está conectado (${st.detail})` };
  const body = text.trim().slice(0, 1200);
  const r = await call(`/message/sendText/${encodeURIComponent(c.instancia)}`, { method: "POST", body: JSON.stringify({ number: c.numero, text: body }) });
  const ok = r.status >= 200 && r.status < 300;
  await audit(who, "whatsapp.aviso", ok ? `aceito (HTTP ${r.status})` : `recusado (HTTP ${r.status})`);
  return { sent: ok, detail: !ok ? `HTTP ${r.status}` : st.self ? `aceito, mas ${SELF_WARNING}.` : "aceito pela Evolution (status PENDING = ainda não confirmado como entregue)" };
}

export function centralLink(pathname: string): string {
  return new URL(pathname, cfg().publicUrl).toString();
}
