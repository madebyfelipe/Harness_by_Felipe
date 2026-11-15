import { addMessage, getConversation, listMessages, updateConversation } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { writeNotes } from "@/lib/notes";
import { startRun } from "@/lib/runner";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return fail("Conversa não encontrada.", 404);
  const body = await readJson<{ text?: string; attachmentIds?: unknown; audio?: unknown }>(req);
  const text = str(body.text, 40_000).trim();
  const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map((a) => String(a)).slice(0, 10) : [];
  if (!text && !attachmentIds.length) return fail("Escreva uma mensagem.");

  // "fb: …" vai direto para feedback.md, sem modelo, e a resposta é só "anotado".
  const fb = /^\s*fb\s*:\s*/i.exec(text);
  if (fb && conversation.mode === "chat") {
    const first = !(await listMessages(id)).length;
    const userMessage = await addMessage({ conversationId: id, role: "user", content: text });
    const texto = text.slice(fb[0].length);
    const sentimento = /^(bom|boa|gostei|ótimo|otimo)\b/i.test(texto) ? "bom" : /^(ruim|péssimo|pessimo|não gostei|nao gostei)\b/i.test(texto) ? "ruim" : "ideia";
    let content = "anotado";
    try {
      await writeNotes([{ kind: "feedback", texto, sentimento, onde: `Central · chat · ${conversation.title}` }], g.user.name);
    } catch (e) {
      content = `Não consegui anotar: ${e instanceof Error ? e.message : "erro ao gravar"}`;
    }
    const reply = await addMessage({ conversationId: id, role: "assistant", content, meta: { feedback: true, agent: "central" } });
    await updateConversation(id, first ? { title: texto.slice(0, 70) || "Feedback" } : {});
    return json({ userMessage, reply });
  }

  try {
    const started = await startRun({ conversation, text: text || "Veja os anexos.", attachmentIds, audio: body.audio === true });
    return json(started);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível iniciar.", 409);
  }
}
