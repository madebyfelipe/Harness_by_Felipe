import { guard, json } from "@/lib/http";
import { registrationOptions } from "@/lib/webauthn";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json(await registrationOptions(g.user));
}
