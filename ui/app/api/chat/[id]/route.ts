import { archiveConversation, getConversation, listMessages, updateConversation } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { isKnownModel } from "@/lib/models";
import { getProvider } from "@/lib/providers";
import { activeRun, stopRun } from "@/lib/runner";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return fail("Conversa não encontrada.", 404);
  return json({ conversation, messages: await listMessages(id), active: activeRun(id) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return fail("Conversa não encontrada.", 404);
  const body = await readJson(req);
  const model = str(body.model, 60);
  const title = str(body.title, 120).trim();
  if (model && !isKnownModel(model)) return fail("Modelo desconhecido.");
  let provider: string | undefined;
  if (typeof body.provider === "string") {
    provider = str(body.provider, 60);
    if (provider && !(await getProvider(provider))) return fail("Provedor não encontrado.");
  }
  await updateConversation(id, { ...(model ? { model } : {}), ...(title ? { title } : {}), ...(provider !== undefined ? { provider } : {}) });
  return json({ conversation: await getConversation(id) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  await stopRun(id);
  await archiveConversation(id);
  return json({ ok: true });
}
