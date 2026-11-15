import { createOwner, createSession, discardSetupToken, newRecoveryCodes, userExists } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { getDb, kvDel, kvGet } from "@/lib/db";
import { fail, json, readJson, sameOrigin, str } from "@/lib/http";
import { blockedFor, recordFailure } from "@/lib/ratelimit";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem não permitida.", 403);
  if (await userExists()) return fail("A conta já existe. Entre com ela.", 409);
  const body = await readJson(req);
  const pendingId = str(body.pendingId, 100);
  const key = `setup:confirm:${pendingId}`;
  if (blockedFor(key, 8, 15 * 60_000)) return fail("Muitas tentativas. Comece de novo.", 429);
  const stored = await kvGet(`setup:pending:${pendingId}`);
  if (!stored) return fail("A configuração expirou. Comece de novo.", 410);
  const pending = JSON.parse(decrypt(stored)) as { name: string; passwordHash: string; secret: string };

  const counter = verifyTotp(pending.secret, str(body.code, 20));
  if (counter === null) {
    recordFailure(key, 15 * 60_000);
    return fail("Código incorreto. Confira o app autenticador e a hora do aparelho.");
  }
  const recoveryCodes = newRecoveryCodes();
  const user = await createOwner(pending.name, pending.passwordHash, pending.secret, recoveryCodes);
  const db = await getDb();
  await db.run("UPDATE users SET totp_last_counter = ? WHERE id = ?", [counter, user.id]);
  await kvDel(`setup:pending:${pendingId}`);
  discardSetupToken();
  await createSession(user, "senha+2fa", req.headers.get("user-agent"));
  return json({ recoveryCodes });
}
