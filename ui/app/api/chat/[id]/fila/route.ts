import { getConversation } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { cancelQueued, enqueue, listQueued } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ items: await listQueued((await ctx.params).id) });
}

/** Na fila (sem runAt): sai quando a execução atual terminar. Com runAt: agendada. */
export async function POST(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  if (!(await getConversation(id))) return fail("Conversa não encontrada.", 404);
  const body = await readJson(req);
  const text = str(body.text, 40_000).trim();
  if (!text) return fail("Escreva uma mensagem.");
  let runAt: string | null = null;
  if (body.runAt) {
    const d = new Date(String(body.runAt));
    if (Number.isNaN(d.getTime())) return fail("Data inválida.");
    if (d.getTime() < Date.now() - 60_000) return fail("Escolha um horário no futuro.");
    if (d.getTime() > Date.now() + 90 * 86400_000) return fail("No máximo 90 dias à frente.");
    runAt = d.toISOString();
  }
  return json({ item: await enqueue(id, text, runAt) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const item = str(new URL(req.url).searchParams.get("item"), 60);
  if (!item) return fail("Qual mensagem?");
  await cancelQueued((await ctx.params).id, item);
  return json({ ok: true });
}
