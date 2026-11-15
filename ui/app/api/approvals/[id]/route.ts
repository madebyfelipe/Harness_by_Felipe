import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { decideApproval } from "@/lib/runner";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const { decision } = await readJson<{ decision?: string }>(req);
  if (decision !== "allow" && decision !== "allow_always" && decision !== "deny") return fail("Decisão inválida.");
  const found = await decideApproval(id, decision);
  if (!found) return fail("Este pedido já foi respondido ou expirou.", 410);
  await audit(g.user.name, `aprovacao.${decision}`, id);
  return json({ ok: true });
}
