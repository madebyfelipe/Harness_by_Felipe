import { cookies } from "next/headers";
import { isSecureOrigin } from "@/lib/config";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { loginBlocked } from "@/lib/ratelimit";
import { authenticationOptions } from "@/lib/webauthn";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  if (loginBlocked(clientIp(req))) return fail("Muitas tentativas. Tente mais tarde.", 429);
  const { options, flow } = await authenticationOptions();
  (await cookies()).set("central_wa", flow, { httpOnly: true, sameSite: "strict", secure: isSecureOrigin(), path: "/api/auth/passkey", maxAge: 300 });
  return json(options);
}
