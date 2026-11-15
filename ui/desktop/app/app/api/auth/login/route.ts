import { checkPasswordLogin, createSession } from "@/lib/auth";
import { clientIp, fail, json, readJson, sameOrigin, str } from "@/lib/http";
import { loginBlocked, loginFailed, loginSucceeded } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  const ip = clientIp(req);
  const wait = loginBlocked(ip);
  if (wait) return fail(`Muitas tentativas. Tente de novo em ${Math.ceil(wait / 60)} min.`, 429);
  const body = await readJson(req);
  const user = await checkPasswordLogin(str(body.password, 300), str(body.code, 40));
  if (!user) {
    loginFailed(ip);
    return fail("Senha ou código incorreto.", 401);
  }
  loginSucceeded(ip);
  await createSession(user, "senha+2fa", req.headers.get("user-agent"));
  return json({ ok: true });
}
