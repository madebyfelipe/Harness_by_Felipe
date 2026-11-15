type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { __centralBuckets?: Map<string, Bucket> };
const buckets = (g.__centralBuckets ??= new Map<string, Bucket>());

function bucket(key: string, windowMs: number, now: number): Bucket {
  const b = buckets.get(key);
  if (b && b.resetAt > now) return b;
  const fresh = { count: 0, resetAt: now + windowMs };
  buckets.set(key, fresh);
  return fresh;
}

/** Segundos até liberar, ou 0 se ainda pode tentar. */
export function blockedFor(key: string, max: number, windowMs: number, now = Date.now()): number {
  const b = bucket(key, windowMs, now);
  return b.count >= max ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

export function recordFailure(key: string, windowMs: number, now = Date.now()): void {
  bucket(key, windowMs, now).count += 1;
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}

export const LOGIN_WINDOW = 15 * 60_000;
export const LOGIN_MAX_PER_IP = 5;
export const LOGIN_MAX_GLOBAL = 20;

export function loginBlocked(ip: string): number {
  return Math.max(blockedFor(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW), blockedFor("login:global", LOGIN_MAX_GLOBAL, LOGIN_WINDOW));
}

export function loginFailed(ip: string): void {
  recordFailure(`login:ip:${ip}`, LOGIN_WINDOW);
  recordFailure("login:global", LOGIN_WINDOW);
}

export function loginSucceeded(ip: string): void {
  clearFailures(`login:ip:${ip}`);
}
