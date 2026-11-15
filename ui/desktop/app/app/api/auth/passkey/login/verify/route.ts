import { cookies } from "next/headers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { createSession } from "@/lib/auth";
import { clientIp, fail, json, readJson, sameOrigin } from "@/lib/http";
import { loginBlocked, loginFailed, loginSucceeded } from "@/lib/ratelimit";
import { finishAuthentication } from "@/lib/webauthn";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  const ip = clientIp(req);
  if (loginBlocked(ip)) return fail("Muitas tentativas. Tente mais tarde.", 429);
  const jar = await cookies();
  const flow = jar.get("central_wa")?.value || "";
  jar.delete({ name: "central_wa", path: "/api/auth/passkey" });
  const body = await readJson<{ response?: AuthenticationResponseJSON }>(req);
  let user = null;
  try {
    if (flow && body.response?.id) user = await finishAuthentication(flow, body.response);
  } catch {
    user = null;
  }
  if (!user) {
    loginFailed(ip);
    return fail("Passkey não reconhecida.", 401);
  }
  loginSucceeded(ip);
  await createSession(user, "passkey", req.headers.get("user-agent"));
  return json({ ok: true });
}
