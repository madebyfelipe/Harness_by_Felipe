import { loadVault } from "@/lib/vault";
import { getConnector, testConnector } from "@/lib/connectors";
import { fail, guard, json } from "@/lib/http";

export async function POST(req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  await loadVault();
  const { nome } = await ctx.params;
  const c = getConnector(nome);
  if (!c) return fail("Conector não encontrado.", 404);
  return json({ result: await testConnector(c) });
}
