import { json, fail } from "@/lib/http";
import { claimEvent, handleInbound, logInbound } from "@/lib/whatsapp-in";
import { mediaBase64, tokenOk, webhookToken } from "@/lib/whatsapp";

export const maxDuration = 300;

/*
 * Webhook da Evolution (canal de entrada do WhatsApp).
 * Endereço: /api/whatsapp/webhook?token=<segredo da tela Apps → WhatsApp>.
 * Responde 200 na hora e processa depois: a Evolution desiste em poucos segundos, e
 * transcrever áudio na primeira vez carrega o modelo do Whisper.
 */

type WaMessage = {
  key?: { id?: string; remoteJid?: string; fromMe?: boolean };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    audioMessage?: { mimetype?: string; ptt?: boolean };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    documentMessage?: { caption?: string; fileName?: string };
    ephemeralMessage?: { message?: WaMessage["message"] };
    viewOnceMessage?: { message?: WaMessage["message"] };
    viewOnceMessageV2?: { message?: WaMessage["message"] };
  };
  messageType?: string;
};

/** Tira o texto de qualquer formato de mensagem que a Evolution manda. */
function textOf(m: WaMessage["message"]): string {
  if (!m) return "";
  const inner = m.ephemeralMessage?.message ?? m.viewOnceMessage?.message ?? m.viewOnceMessageV2?.message;
  if (inner && inner !== m) return textOf(inner);
  return (
    m.conversation?.trim() ||
    m.extendedTextMessage?.text?.trim() ||
    m.imageMessage?.caption?.trim() ||
    m.videoMessage?.caption?.trim() ||
    m.documentMessage?.caption?.trim() ||
    ""
  );
}

function messagesOf(body: unknown): WaMessage[] {
  const b = body as { data?: unknown; event?: string };
  const data = b?.data as { messages?: WaMessage[] } | WaMessage | undefined;
  if (Array.isArray((data as { messages?: WaMessage[] })?.messages)) return (data as { messages: WaMessage[] }).messages;
  if (data && typeof data === "object" && (data as WaMessage).key) return [data as WaMessage];
  return [];
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!tokenOk(token, await webhookToken())) return fail("Token inválido.", 401);
  return json({ ok: true, canal: "whatsapp", pronto: true });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-webhook-token") ?? "";
  if (!tokenOk(token, await webhookToken())) return fail("Token inválido.", 401);

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return json({ ok: true, ignorado: "corpo não é JSON" });
  }
  const evento = String((body as { event?: string })?.event ?? "").toLowerCase();
  if (evento && !/messages[._]upsert|message|send[._]message/.test(evento)) return json({ ok: true, ignorado: `evento ${evento}` });

  const aceitas: Promise<void>[] = [];
  for (const m of messagesOf(body).slice(0, 5)) {
    const id = m.key?.id ?? "";
    const jid = m.key?.remoteJid ?? "";
    if (!id || !jid || m.key?.fromMe) continue;
    if (!(await claimEvent(id))) continue;
    const texto = textOf(m.message);
    const audio = Boolean(m.message?.audioMessage);
    const mimetype = m.message?.audioMessage?.mimetype;
    const key = m.key as Record<string, unknown>;

    // Fora do caminho da resposta: quem espera é o navegador da Evolution, não o Felipe.
    aceitas.push(
      (async () => {
        let audioBase64: string | undefined;
        if (audio) {
          try {
            const media = await mediaBase64(key);
            audioBase64 = media.base64;
          } catch (e) {
            await logInbound(`áudio não baixado: ${e instanceof Error ? e.message : "erro"}`);
          }
        }
        const r = await handleInbound({ id, jid, text: texto, audioBase64, mimetype, pushName: m.pushName });
        await logInbound(`${jid.split("@")[0]}: ${r.detail}${texto ? ` · "${texto.slice(0, 80)}"` : audio ? " · áudio" : ""}`);
      })().catch((e) => console.error("[central] entrada do WhatsApp falhou:", e instanceof Error ? e.message : e))
    );
  }
  if (aceitas.length) void Promise.all(aceitas);
  return json({ ok: true, recebidas: aceitas.length });
}
