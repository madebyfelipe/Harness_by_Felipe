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

export async function waState(): Promise<{ ok: boolean; state: string; detail: string }> {
  try {
    const c = await waConfig();
    const r = await call(`/instance/connectionState/${encodeURIComponent(c.instancia)}`);
    const state = String((r.data as { instance?: { state?: string } } | null)?.instance?.state ?? (r.status === 401 ? "chave recusada" : `HTTP ${r.status}`));
    return { ok: state === "open", state, detail: state === "open" ? "conectado" : `estado: ${state}` };
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
  return { sent: ok, detail: ok ? "aceito pela Evolution (status PENDING = ainda não confirmado como entregue)" : `HTTP ${r.status}` };
}

export function centralLink(pathname: string): string {
  return new URL(pathname, cfg().publicUrl).toString();
}
