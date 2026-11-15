import { guard, json } from "@/lib/http";
import { stopRun } from "@/lib/runner";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  return json({ stopped: await stopRun(id) });
}
