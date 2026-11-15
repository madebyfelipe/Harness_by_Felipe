import { getConversation } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { startRun } from "@/lib/runner";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return fail("Conversa não encontrada.", 404);
  const body = await readJson<{ text?: string; attachmentIds?: unknown }>(req);
  const text = str(body.text, 40_000).trim();
  const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map((a) => String(a)).slice(0, 10) : [];
  if (!text && !attachmentIds.length) return fail("Escreva uma mensagem.");
  try {
    const started = await startRun({ conversation, text: text || "Veja os anexos.", attachmentIds });
    return json(started);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível iniciar.", 409);
  }
}
