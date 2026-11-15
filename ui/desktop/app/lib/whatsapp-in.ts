import { addMessage, createConversation, getConversation, listMessages } from "./chat";
import { getDb, kvGet, kvSet } from "./db";
import { nowIso } from "./config";
import { startRun, decideApproval, stopRun } from "./runner";
import { AUTO_AGENT, TRIAGE_MODEL } from "./triage";
import { centralLink, sendTo, waConfig, waState } from "./whatsapp";

/*
 * Canal de entrada do WhatsApp (Fase 3): o Felipe manda texto ou áudio para a instância
 * da Evolution e a Central trata como uma conversa normal — triagem sempre ligada, mesmo
 * caminho do chat — e responde no próprio WhatsApp.
 *
 * Regras:
 *  - só o número do Felipe é aceito (o resto é ignorado em silêncio);
 *  - o mesmo evento repetido não roda duas vezes (a Evolution reenvia);
 *  - aprovação de comando/escrita pode ser respondida no WhatsApp com "ok" ou "não";
 *  - "pare" interrompe a execução em andamento.
 */

const CONV_KEY = "whatsapp.conversa";
const DEDUP_PREFIX = "whatsapp.evento.";

/** Chave de deduplicação do evento (a Evolution reenvia quando acha que falhou). */
async function seen(id: string): Promise<boolean> {
  if (!id) return false;
  const key = DEDUP_PREFIX + id.replace(/[^\w:@.-]/g, "").slice(0, 80);
  if (await kvGet(key)) return true;
  await kvSet(key, "1", 6 * 60 * 60);
  return false;
}

/** Marca o evento como recebido. `true` só na primeira vez (o resto é reenvio). */
export async function claimEvent(id: string): Promise<boolean> {
  return !(await seen(id));
}

/** A conversa "WhatsApp" desta Central, criada na primeira mensagem. */
async function inboundConversation() {
  const salva = await kvGet(CONV_KEY);
  if (salva) {
    const c = await getConversation(salva);
    if (c) return c;
  }
  const c = await createConversation({ mode: "chat", agent: AUTO_AGENT, model: TRIAGE_MODEL, title: "WhatsApp" });
  await kvSet(CONV_KEY, c.id);
  return c;
}

/** Aprovação pendente desta conversa, se houver (para responder "ok" ou "não"). */
async function pendingApproval(conversationId: string): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.get<{ id: string }>("SELECT id FROM approvals WHERE conversation_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [conversationId]);
  return row?.id;
}

export function normalizeNumber(jid: string): string {
  return String(jid ?? "").split("@")[0].replace(/\D/g, "");
}

export type InboundResult = { ok: boolean; detail: string };

/**
 * Trata uma mensagem já extraída do evento da Evolution.
 * `audio` vem em base64 (ogg/opus) quando é nota de voz.
 */
export async function handleInbound(input: {
  id: string;
  jid: string;
  text?: string;
  audioBase64?: string;
  mimetype?: string;
  pushName?: string;
}): Promise<InboundResult> {
  const cfgWa = await waConfig();
  const de = normalizeNumber(input.jid);
  if (!de) return { ok: false, detail: "número de origem vazio" };
  if (input.jid.includes("@g.us")) return { ok: false, detail: "grupo ignorado" };
  const alvo = cfgWa.numero;
  const sem9 = (n: string) => (n.length === 13 && n.startsWith("55") ? n.slice(0, 4) + n.slice(5) : n);
  if (!alvo || sem9(de) !== sem9(alvo)) {
    return { ok: false, detail: `ignorado: não é o número do Felipe (${de.slice(0, 4)}…)` };
  }

  const state = await waState();
  if (!state.ok) return { ok: false, detail: `WhatsApp não está conectado (${state.detail})` };

  const conversa = await inboundConversation();
  const texto = (input.text ?? "").trim();

  // "pare": interrompe o que estiver rodando nesta conversa.
  if (/^(pare|para|stop|cancela)$/i.test(texto)) {
    await stopRun(conversa.id);
    await sendTo(de, "Parei.", "whatsapp");
    return { ok: true, detail: "execução interrompida" };
  }

  // "ok" / "não": responde a aprovação pendente desta conversa.
  const pendente = await pendingApproval(conversa.id);
  if (pendente && /^(ok|pode|sim|permitir|manda|vai)$/i.test(texto)) {
    await decideApproval(pendente, "allow");
    await sendTo(de, "Permitido.", "whatsapp");
    return { ok: true, detail: "aprovação liberada pelo WhatsApp" };
  }
  if (pendente && /^(n[aã]o|nega|negar|para)$/i.test(texto)) {
    await decideApproval(pendente, "deny");
    await sendTo(de, "Negado.", "whatsapp");
    return { ok: true, detail: "aprovação negada pelo WhatsApp" };
  }

  let audio = false;
  let conteudo = texto;
  if (input.audioBase64 && !texto) {
    try {
      const { decodeOggOpus } = await import("./audio");
      const { transcribe } = await import("./transcribe");
      const pcm = await decodeOggOpus(new Uint8Array(Buffer.from(input.audioBase64, "base64")));
      const t = await transcribe(pcm);
      conteudo = t.text.trim();
      audio = true;
      if (!conteudo) {
        await sendTo(de, "Não entendi o áudio. Fala de novo?", "whatsapp");
        return { ok: false, detail: "áudio sem transcrição" };
      }
    } catch (e) {
      await sendTo(de, `Não consegui ouvir esse áudio (${e instanceof Error ? e.message : "erro"}). Escreve?`, "whatsapp");
      return { ok: false, detail: "áudio não decodificado" };
    }
  }
  if (!conteudo) return { ok: false, detail: "mensagem sem texto nem áudio" };

  // "fb: …" anota feedback direto, como no chat.
  const fb = /^\s*fb\s*:\s*/i.exec(conteudo);
  if (fb) {
    const { writeNotes } = await import("./notes");
    const corpo = conteudo.slice(fb[0].length);
    const sentimento = /^(bom|boa|gostei|ótimo|otimo)\b/i.test(corpo) ? "bom" : /^(ruim|péssimo|pessimo|não gostei|nao gostei)\b/i.test(corpo) ? "ruim" : "ideia";
    await addMessage({ conversationId: conversa.id, role: "user", content: conteudo });
    let resposta = "anotado";
    try {
      await writeNotes([{ kind: "feedback", texto: corpo, sentimento, onde: "Central · WhatsApp" }], "Felipe");
    } catch (e) {
      resposta = `Não consegui anotar: ${e instanceof Error ? e.message : "erro ao gravar"}`;
    }
    await addMessage({ conversationId: conversa.id, role: "assistant", content: resposta, meta: { feedback: true, agent: "central" } });
    await sendTo(de, resposta, "whatsapp");
    return { ok: true, detail: "feedback anotado" };
  }

  const primeira = !(await listMessages(conversa.id)).length;
  try {
    await startRun({
      conversation: conversa,
      text: conteudo,
      audio,
      origin: "chat",
      onEnd: async (end) => {
        const corpo = end.error
          ? `Não consegui terminar: ${end.error.slice(0, 400)}\n${centralLink(`/chat/${end.conversationId}`)}`
          : (end.text || "Terminei, sem texto para mostrar.") + `\n${centralLink(`/chat/${end.conversationId}`)}`;
        const envio = await sendTo(de, corpo, "whatsapp");
        if (!envio.sent) console.error("[central] resposta no WhatsApp não saiu:", envio.detail);
      },
      // Aprovação no meio do caminho: o cartão aparece no chat e a pergunta vem também no WhatsApp.
      onApproval: async (a) => {
        await sendTo(
          de,
          `Preciso da sua aprovação:\n${a.tool}: ${a.summary.slice(0, 400)}\nResponda "ok" para permitir ou "não" para negar.`,
          "whatsapp"
        );
      }
    });
    if (primeira) await sendTo(de, audio ? "Ouvi. Já estou nisso." : "Recebi. Já estou nisso.", "whatsapp");
    return { ok: true, detail: "execução iniciada" };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "não consegui começar";
    const aviso = /em andamento|rodando/i.test(motivo)
      ? "Ainda estou no pedido anterior. Manda \"pare\" para cancelar."
      : `Não consegui começar: ${motivo}`;
    await addMessage({ conversationId: conversa.id, role: "assistant", content: aviso, meta: { agent: "central" } });
    await sendTo(de, aviso, "whatsapp");
    return { ok: false, detail: motivo };
  }
}

/** Marca no banco que o canal de entrada recebeu algo (aparece na tela e nos registros). */
export async function logInbound(detail: string): Promise<void> {
  const db = await getDb();
  await db.run("INSERT INTO audit (id, created_at, actor, action, detail) VALUES (?, ?, ?, ?, ?)", [crypto.randomUUID(), nowIso(), "whatsapp", "whatsapp.entrada", detail.slice(0, 500)]).catch(() => undefined);
}
