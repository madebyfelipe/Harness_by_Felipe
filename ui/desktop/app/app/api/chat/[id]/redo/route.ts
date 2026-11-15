import { getConversation, listMessages, updateConversation } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { modelLabel, nextModel } from "@/lib/models";
import { getAgent } from "@/lib/repo";
import { startRun } from "@/lib/runner";

/** "Subir de modelo": refaz o último pedido com o próximo degrau da escada. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return fail("Conversa não encontrada.", 404);
  const messages = await listMessages(id);
  if (!messages.some((m) => m.role === "assistant")) return fail("Ainda não há resposta para refazer.");
  const ladder = conversation.mode === "chat" ? getAgent(conversation.agent)?.ladder : undefined;
  const upper = nextModel(conversation.model, ladder);
  if (!upper) return fail(`${modelLabel(conversation.model)} já é o topo da escada.`);

  const note = str((await readJson(req)).note, 1000).trim();
  await updateConversation(id, { model: upper });
  const text = `Refaça com ${modelLabel(upper)}: a resposta anterior não ficou boa.${note ? `\nO que não ficou bom: ${note}` : ""}\nRefaça do zero a tarefa do meu último pedido, sem reaproveitar a resposta anterior.`;
  try {
    const started = await startRun({ conversation: { ...conversation, model: upper }, text, redo: true });
    return json({ ...started, model: upper });
  } catch (e) {
    await updateConversation(id, { model: conversation.model });
    return fail(e instanceof Error ? e.message : "Não foi possível iniciar.", 409);
  }
}
