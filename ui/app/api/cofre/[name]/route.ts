import { audit } from "@/lib/db";
import { guard, json } from "@/lib/http";
import { deleteSecret } from "@/lib/vault";

export async function DELETE(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { name } = await ctx.params;
  await deleteSecret(name);
  await audit(g.user.name, "cofre.removido", name);
  return json({ ok: true });
}
