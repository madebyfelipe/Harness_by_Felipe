import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { cfg, nowIso } from "./config";
import { randomToken } from "./crypto";
import { audit, getDb, kvDel, kvGet, kvSet } from "./db";
import type { User } from "./auth";

const CHALLENGE_TTL = 5 * 60;

function rp() {
  const url = cfg().publicUrl;
  return { rpID: url.hostname, origin: url.origin, rpName: "Central — Made by Felipe" };
}

export type PasskeyRow = {
  id: string;
  user_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

export async function listPasskeys(userId: string): Promise<PasskeyRow[]> {
  const db = await getDb();
  return db.all<PasskeyRow>("SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at", [userId]);
}

export async function registrationOptions(user: User) {
  const { rpID, rpName } = rp();
  const existing = await listPasskeys(user.id);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" }
  });
  await kvSet(`wa:reg:${user.id}`, options.challenge, CHALLENGE_TTL);
  return options;
}

export async function finishRegistration(user: User, response: RegistrationResponseJSON, name: string): Promise<void> {
  const { rpID, origin } = rp();
  const expected = await kvGet(`wa:reg:${user.id}`);
  if (!expected) throw new Error("O pedido expirou. Tente de novo.");
  await kvDel(`wa:reg:${user.id}`);
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true
  });
  if (!result.verified) throw new Error("Não foi possível confirmar a passkey.");
  const cred = result.registrationInfo.credential;
  const db = await getDb();
  await db.run("INSERT INTO passkeys (id, user_id, public_key, counter, transports, name, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)", [
    cred.id,
    user.id,
    Buffer.from(cred.publicKey).toString("base64url"),
    cred.counter,
    JSON.stringify(cred.transports ?? []),
    name.trim().slice(0, 60) || "Passkey",
    nowIso()
  ]);
  await audit(user.name, "passkey.criada", name);
}

/** Login por passkey: devolve as opções e um id de fluxo (vai em cookie httpOnly). */
export async function authenticationOptions() {
  const { rpID } = rp();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: [] });
  const flow = randomToken(16);
  await kvSet(`wa:auth:${flow}`, options.challenge, CHALLENGE_TTL);
  return { options, flow };
}

export async function finishAuthentication(flow: string, response: AuthenticationResponseJSON): Promise<User | null> {
  const { rpID, origin } = rp();
  const expected = await kvGet(`wa:auth:${flow}`);
  if (!expected) return null;
  await kvDel(`wa:auth:${flow}`);
  const db = await getDb();
  const row = await db.get<PasskeyRow & { user_name: string }>(
    "SELECT p.*, u.name AS user_name FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
    [response.id]
  );
  if (!row) return null;
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: row.id,
      publicKey: new Uint8Array(Buffer.from(row.public_key, "base64url")),
      counter: Number(row.counter),
      transports: JSON.parse(row.transports || "[]")
    }
  });
  if (!result.verified) return null;
  await db.run("UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?", [result.authenticationInfo.newCounter, nowIso(), row.id]);
  return { id: row.user_id, name: row.user_name };
}

export async function removePasskey(user: User, id: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.run("DELETE FROM passkeys WHERE id = ? AND user_id = ?", [id, user.id]);
  if (r.changes) await audit(user.name, "passkey.removida", id.slice(0, 12));
  return r.changes > 0;
}
