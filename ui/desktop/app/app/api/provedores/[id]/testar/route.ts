import { fail, guard, json } from "@/lib/http";
import { checkProvider } from "@/lib/providers";

/** Confere o login sem chamar o modelo (não gasta uso). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  try {
    return json({ info: await checkProvider(id) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível conferir.");
  }
}
