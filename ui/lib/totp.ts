import crypto from "node:crypto";

// TOTP (RFC 6238): SHA-1, 6 dígitos, passo de 30 s — o que os apps autenticadores usam.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;

export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function newTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = mac[mac.length - 1] & 15;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function totpCounter(atMs = Date.now()): number {
  return Math.floor(atMs / 1000 / STEP);
}

/**
 * Confere o código aceitando um passo de folga para cada lado. Devolve o
 * contador usado, para o chamador recusar o mesmo código duas vezes.
 */
export function verifyTotp(secret: string, code: string, lastCounter = 0, atMs = Date.now()): number | null {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const now = totpCounter(atMs);
  for (const c of [now, now - 1, now + 1]) {
    if (c <= lastCounter) continue;
    const expected = hotp(secret, c);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return c;
  }
  return null;
}

export function totpUri(secret: string, account: string, issuer = "Central MBF"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
