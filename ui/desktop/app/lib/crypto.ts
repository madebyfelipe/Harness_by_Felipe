import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cfg } from "./config";

let masterKey: Buffer | undefined;

/**
 * Chave mestra: fica FORA do banco. Vem de CENTRAL_MASTER_KEY (base64, 32 bytes)
 * ou de um arquivo 0600 na pasta de dados, criado no primeiro uso. Quem copia só
 * o banco não consegue abrir o que foi cifrado com ela.
 */
export function getMasterKey(): Buffer {
  if (masterKey) return masterKey;
  const fromEnv = process.env.CENTRAL_MASTER_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64");
    if (key.length !== 32) throw new Error("CENTRAL_MASTER_KEY precisa ter 32 bytes em base64");
    masterKey = key;
    return key;
  }
  const file = path.join(cfg().dataDir, "master.key");
  try {
    const key = Buffer.from(fs.readFileSync(file, "utf8").trim(), "base64");
    if (key.length !== 32) throw new Error("master.key corrompida");
    masterKey = key;
    return key;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(file, key.toString("base64") + "\n", { mode: 0o600, flag: "wx" });
  masterKey = key;
  return key;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", b64u(iv), b64u(cipher.getAuthTag()), b64u(ct)].join(".");
}

export function decrypt(token: string): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("formato cifrado inválido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getMasterKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

const SCRYPT = { N: 32768, r: 8, p: 1, len: 32, maxmem: 96 * 1024 * 1024 };

function scrypt(password: string, salt: Buffer, N: number, r: number, p: number, len: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize("NFKC"), salt, len, { N, r, p, maxmem: SCRYPT.maxmem }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.len);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, b64u(salt), b64u(key)].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, N, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password, Buffer.from(salt, "base64url"), Number(N), Number(r), Number(p), expected.length);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
}
