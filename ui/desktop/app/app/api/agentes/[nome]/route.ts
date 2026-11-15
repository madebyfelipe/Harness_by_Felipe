import { audit } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";
import { deleteAgent } from "@/lib/agents-store";

export async function DELETE(req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  try {
    const commit = await deleteAgent(nome, g.user.name);
    await audit(g.user.name, "agente.excluido", nome);
    return json({ commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível excluir.");
  }
}
