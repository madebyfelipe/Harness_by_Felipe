import { deleteConnector } from "@/lib/connectors";
import { audit } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";

export async function DELETE(req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  try {
    const commit = await deleteConnector(nome, g.user.name);
    await audit(g.user.name, "conector.removido", nome);
    return json({ ok: true, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível remover.", 404);
  }
}
