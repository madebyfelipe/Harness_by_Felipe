import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { cancelLogin } from "@/lib/logins";
import { deleteProvider, getProvider, moveProvider, updateProvider } from "@/lib/providers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  if (!(await getProvider(id))) return fail("Provedor não encontrado.", 404);
  const body = await readJson(req);
  if (body.move === -1 || body.move === 1) await moveProvider(id, body.move);
  await updateProvider(id, {
    ...(typeof body.name === "string" && body.name.trim() ? { name: str(body.name, 60) } : {}),
    ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {})
  });
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  try {
    cancelLogin(id);
    await deleteProvider(id);
    await audit(g.user.name, "provedores.remover", id);
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível remover.");
  }
}
