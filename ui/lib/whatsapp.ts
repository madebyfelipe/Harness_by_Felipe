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

/* ------------------------------------------------------------------ */
/* Canal de entrada (Fase 3): você fala no WhatsApp e a Central responde */
/* ------------------------------------------------------------------ */

/** Envia texto para qualquer número (resposta do canal de entrada). */
export async function sendTo(number: string, text: string, who = "central"): Promise<{ sent: boolean; detail: string }> {
  const c = await waConfig();
  if (!/^\d{10,15}$/.test(number)) return { sent: false, detail: "número inválido" };
  const body = text.trim().slice(0, 3500) || "(sem texto)";
  try {
    const r = await call(`/message/sendText/${encodeURIComponent(c.instancia)}`, { method: "POST", body: JSON.stringify({ number, text: body }) });
    const ok = r.status >= 200 && r.status < 300;
    await audit(who, "whatsapp.resposta", ok ? `aceito (HTTP ${r.status})` : `recusado (HTTP ${r.status})`);
    return { sent: ok, detail: ok ? "aceito pela Evolution" : `HTTP ${r.status}` };
  } catch (e) {
    return { sent: false, detail: e instanceof Error ? e.message : "sem resposta da Evolution" };
  }
}

/** Segredo do webhook, criado na primeira vez que a tela pede. Fica no banco, não no repositório. */
export async function webhookToken(): Promise<string> {
  const salvo = await kvGet("whatsapp.webhookToken");
  if (salvo) return salvo;
  const novo = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await kvSet("whatsapp.webhookToken", novo);
  return novo;
}

/** Compara sem vazar tempo (o token vem da internet). */
export function tokenOk(received: string, esperado: string): boolean {
  if (!received || !esperado || received.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= received.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diff === 0;
}

export function webhookUrl(token: string): string {
  return `${centralLink("/api/whatsapp/webhook").replace(/\/$/, "")}?token=${encodeURIComponent(token)}`;
}

/** Liga ou desliga o envio de eventos da instância para a Central. */
export async function setInbound(enabled: boolean, who = "central"): Promise<{ ok: boolean; detail: string }> {
  const c = await waConfig();
  const url = webhookUrl(await webhookToken());
  const r = await call(`/webhook/set/${encodeURIComponent(c.instancia)}`, {
    method: "POST",
    body: JSON.stringify({ webhook: { enabled, url, events: ["MESSAGES_UPSERT"], base64: false, byEvents: false } })
  });
  const ok = r.status >= 200 && r.status < 300;
  await audit(who, enabled ? "whatsapp.entrada.ligar" : "whatsapp.entrada.desligar", ok ? `aceito (HTTP ${r.status})` : `recusado (HTTP ${r.status})`);
  return { ok, detail: ok ? (enabled ? "entrada ligada" : "entrada desligada") : `a Evolution recusou (HTTP ${r.status})` };
}

/** O que a Evolution tem hoje como webhook desta instância. */export async function inboundState(): Promise<{ enabled: boolean; detail: string; url: string }> {
  const esperado = webhookUrl(await webhookToken());
  try {
    const c = await waConfig();
    const r = await call(`/webhook/find/${encodeURIComponent(c.instancia)}`);
    const w = (r.data ?? {}) as { enabled?: boolean; url?: string };
    const same = String(w.url ?? "") === esperado;
    return {
      enabled: Boolean(w.enabled) && same,
      url: esperado,
      detail: !w.enabled ? "desligada na Evolution" : same ? "ligada, apontando para esta Central" : `ligada para outro endereço (${String(w.url ?? "vazio").slice(0, 60)})`
    };
  } catch (e) {
    return { enabled: false, url: esperado, detail: e instanceof Error ? e.message : "sem resposta da Evolution" };
  }
}

/** Baixa a mídia de uma mensagem em base64 (nota de voz) pelo id da mensagem. */
export async function mediaBase64(key: Record<string, unknown>): Promise<{ base64: string; mimetype: string }> {
  const c = await waConfig();
  const r = await call(`/chat/getBase64FromMediaMessage/${encodeURIComponent(c.instancia)}`, {
    method: "POST",
    body: JSON.stringify({ message: { key }, convertToMp4: false })
  });
  const d = (r.data ?? {}) as { base64?: string; mimetype?: string; mediaType?: string };
  if (r.status < 200 || r.status >= 300 || !d.base64) throw new Error(`a Evolution não devolveu a mídia (HTTP ${r.status})`);
  return { base64: d.base64, mimetype: d.mimetype ?? d.mediaType ?? "audio/ogg" };
}
