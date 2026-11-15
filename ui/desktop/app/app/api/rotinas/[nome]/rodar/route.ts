import { audit } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";
import { getRoutine, runRoutine } from "@/lib/routines";

export async function POST(req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  const r = getRoutine(nome);
  if (!r) return fail("Rotina não encontrada.", 404);
  try {
    const started = await runRoutine(r, "manual", g.user.name);
    await audit(g.user.name, "rotina.rodar", nome);
    return json(started);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível rodar.", 409);
  }
}
