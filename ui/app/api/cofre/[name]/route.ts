import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { deleteSecret, listSecretNames, setScope } from "@/lib/vault";

/** Muda só o escopo (quem pode usar), sem tocar no valor. */
export async function POST(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { name } = await ctx.params;
  const body = await readJson<{ agents?: unknown }>(req);
  if (!(await listSecretNames()).some((s) => s.name === name)) return fail("Segredo não encontrado.", 404);
  const agents = Array.isArray(body.agents) ? body.agents.map(String) : null;
  await setScope(name, agents);
  await audit(g.user.name, "cofre.escopo", `${name}: ${agents?.length ? agents.join(", ") : "todos"}`);
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { name } = await ctx.params;
  await deleteSecret(name);
  await audit(g.user.name, "cofre.removido", name);
  return json({ ok: true });
}
