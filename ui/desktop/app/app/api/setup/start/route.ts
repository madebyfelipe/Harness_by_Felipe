import QRCode from "qrcode";
import { checkSetupToken, hashPassword, passwordProblem, userExists } from "@/lib/auth";
import { encrypt, randomToken } from "@/lib/crypto";
import { kvSet } from "@/lib/db";
import { clientIp, fail, json, readJson, sameOrigin, str } from "@/lib/http";
import { blockedFor, recordFailure } from "@/lib/ratelimit";
import { newTotpSecret, totpUri } from "@/lib/totp";

const WINDOW = 15 * 60_000;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  if (await userExists()) return fail("A conta já existe. Entre com ela.", 409);
  const key = `setup:${clientIp(req)}`;
  const wait = Math.max(blockedFor(key, 5, WINDOW), blockedFor("setup:global", 20, WINDOW));
  if (wait) return fail(`Muitas tentativas. Tente de novo em ${Math.ceil(wait / 60)} min.`, 429);

  const body = await readJson(req);
  const name = str(body.name, 60).trim();
  const password = str(body.password, 300);
  if (!checkSetupToken(str(body.token, 200))) {
    recordFailure(key, WINDOW);
    recordFailure("setup:global", WINDOW);
    return fail("Token de configuração incorreto.", 403);
  }
  if (!name) return fail("Diga o seu nome.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const secret = newTotpSecret();
  const pendingId = randomToken(16);
  const pending = { name, passwordHash: await hashPassword(password), secret };
  await kvSet(`setup:pending:${pendingId}`, encrypt(JSON.stringify(pending)), 15 * 60);
  const qrSvg = await QRCode.toString(totpUri(secret, name), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return json({ pendingId, secret, qrSvg });
}
