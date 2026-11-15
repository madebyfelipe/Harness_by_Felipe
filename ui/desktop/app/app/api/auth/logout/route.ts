import { destroySession } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  await destroySession();
  return json({ ok: true });
}
