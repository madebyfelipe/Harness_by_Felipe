import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { cancelLogin, loginState, startLogin, submitCode } from "@/lib/logins";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  return json({ login: loginState(id) });
}

export async function POST(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  try {
    const login = await startLogin(id);
    await audit(g.user.name, "provedores.login", id);
    return json({ login });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível começar o login.");
  }
}

/** Código que a página da Anthropic mostra depois do login. Vai direto para o CLI; não é guardado. */
export async function PUT(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  try {
    return json({ login: submitCode(id, str((await readJson(req)).code, 400)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Código não aceito.");
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  cancelLogin(id);
  return json({ ok: true });
}
