import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cfg, isSecureOrigin, nowIso } from "./config";
import { decrypt, encrypt, hashPassword, randomToken, safeEqual, sha256, verifyPassword } from "./crypto";
import { audit, getDb } from "./db";
import { verifyTotp } from "./totp";

export const SESSION_COOKIE = "central_session";
const SESSION_DAYS = 30;

export type User = { id: string; name: string };
type UserRow = User & { password_hash: string; totp_secret_enc: string; totp_last_counter: number };

export async function getOwner(): Promise<UserRow | undefined> {
  const db = await getDb();
  return db.get<UserRow>("SELECT id, name, password_hash, totp_secret_enc, totp_last_counter FROM users LIMIT 1");
}

export async function userExists(): Promise<boolean> {
  return Boolean(await getOwner());
}

/* ---------- token de configuração inicial ---------- */

function setupTokenFile(): string {
  return path.join(cfg().dataDir, "setup-token");
}

/** Token que prova que quem está criando a conta tem acesso à máquina. */
export function getSetupToken(): string {
  if (process.env.CENTRAL_SETUP_TOKEN) return process.env.CENTRAL_SETUP_TOKEN;
  const file = setupTokenFile();
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const token = randomToken(18);
    fs.writeFileSync(file, token + "\n", { mode: 0o600 });
    console.log(`[central] Conta ainda não criada. Token de configuração em: ${file}`);
    return token;
  }
}

export function checkSetupToken(given: string): boolean {
  return Boolean(given) && safeEqual(given.trim(), getSetupToken());
}

export function discardSetupToken(): void {
  try {
    fs.unlinkSync(setupTokenFile());
  } catch {
    /* já removido, ou veio do ambiente */
  }
}

/* ---------- conta ---------- */

export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "A senha precisa de pelo menos 12 caracteres.";
  if (password.length > 200) return "Senha longa demais.";
  return null;
}

export function newRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const raw = randomToken(9).replace(/[-_]/g, "x").toLowerCase().slice(0, 12);
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export async function createOwner(name: string, passwordHash: string, totpSecret: string, recovery: string[]): Promise<User> {
  const db = await getDb();
  if (await userExists()) throw new Error("A conta já existe.");
  const id = crypto.randomUUID();
  await db.run("INSERT INTO users (id, name, password_hash, totp_secret_enc, totp_last_counter, created_at) VALUES (?, ?, ?, ?, 0, ?)", [
    id,
    name,
    passwordHash,
    encrypt(totpSecret),
    nowIso()
  ]);
  for (const code of recovery) {
    await db.run("INSERT INTO recovery_codes (code_hash, user_id, used_at) VALUES (?, ?, NULL)", [sha256(code), id]);
  }
  await audit(name, "conta.criada");
  return { id, name };
}

export { hashPassword };

/** Senha + segundo fator (código do app ou código de recuperação). */
export async function checkPasswordLogin(password: string, code: string): Promise<User | null> {
  const owner = await getOwner();
  if (!owner) return null;
  const passOk = await verifyPassword(password, owner.password_hash);
  if (!passOk) return null;
  const db = await getDb();
  const clean = code.trim().toLowerCase();
  if (/^\d{6}$/.test(clean.replace(/\s+/g, ""))) {
    const counter = verifyTotp(decrypt(owner.totp_secret_enc), clean, owner.totp_last_counter);
    if (counter === null) return null;
    await db.run("UPDATE users SET totp_last_counter = ? WHERE id = ?", [counter, owner.id]);
    return { id: owner.id, name: owner.name };
  }
  const used = await db.run("UPDATE recovery_codes SET used_at = ? WHERE code_hash = ? AND user_id = ? AND used_at IS NULL", [
    nowIso(),
    sha256(clean),
    owner.id
  ]);
  if (used.changes !== 1) return null;
  await audit(owner.name, "login.codigo_de_recuperacao");
  return { id: owner.id, name: owner.name };
}

/* ---------- sessões ---------- */

export async function createSession(user: User, method: string, userAgent: string | null): Promise<void> {
  const db = await getDb();
  const token = randomToken(32);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.run("INSERT INTO sessions (id_hash, user_id, method, user_agent, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    sha256(token),
    user.id,
    method,
    (userAgent || "").slice(0, 300),
    now.toISOString(),
    now.toISOString(),
    expires.toISOString()
  ]);
  await db.run("DELETE FROM sessions WHERE expires_at < ?", [now.toISOString()]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureOrigin(),
    path: "/",
    expires
  });
  await audit(user.name, "login", method);
}

export async function currentUser(): Promise<(User & { sessionHash: string }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const hash = sha256(token);
  const row = await db.get<{ user_id: string; name: string; expires_at: string; last_seen_at: string }>(
    "SELECT s.user_id, u.name, s.expires_at, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ?",
    [hash]
  );
  if (!row) return null;
  const now = new Date();
  if (row.expires_at < now.toISOString()) {
    await db.run("DELETE FROM sessions WHERE id_hash = ?", [hash]);
    return null;
  }
  if (now.getTime() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    await db.run("UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?", [now.toISOString(), hash]);
  }
  return { id: row.user_id, name: row.name, sessionHash: hash };
}

/** Para páginas: sem sessão, vai para o login (ou para a configuração inicial). */
export async function requireUser(): Promise<User & { sessionHash: string }> {
  const user = await currentUser();
  if (user) return user;
  redirect((await userExists()) ? "/entrar" : "/configurar");
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.run("DELETE FROM sessions WHERE id_hash = ?", [sha256(token)]);
  }
  jar.delete(SESSION_COOKIE);
}
