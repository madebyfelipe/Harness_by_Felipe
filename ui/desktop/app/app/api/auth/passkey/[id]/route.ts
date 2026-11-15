import { fail, guard, json } from "@/lib/http";
import { removePasskey } from "@/lib/webauthn";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  return (await removePasskey(g.user, id)) ? json({ ok: true }) : fail("Passkey não encontrada.", 404);
}
