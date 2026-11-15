import path from "node:path";
import { cfg } from "../config";
import { migrate } from "./migrations";
import type { Db } from "./types";

export type { Db } from "./types";

// Uma conexão por processo, também no `next dev` (que recarrega módulos).
const g = globalThis as unknown as { __centralDb?: Promise<Db> };

async function open(): Promise<Db> {
  const c = cfg();
  let db: Db;
  if (c.databaseUrl) {
    const { openPostgres } = await import("./postgres");
    db = await openPostgres(c.databaseUrl);
  } else {
    const { openSqlite } = await import("./sqlite");
    db = openSqlite(path.join(c.dataDir, "central.db"));
  }
  await migrate(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__centralDb) {
    g.__centralDb = open().catch((e) => {
      g.__centralDb = undefined;
      throw e;
    });
  }
  return g.__centralDb;
}

export function parseJson<T>(text: unknown, fallback: T): T {
  if (typeof text !== "string" || !text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function kvGet(key: string): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.get<{ value: string; expires_at: string | null }>("SELECT value, expires_at FROM kv WHERE key = ?", [key]);
  if (!row) return undefined;
  if (row.expires_at && row.expires_at < new Date().toISOString()) {
    await db.run("DELETE FROM kv WHERE key = ?", [key]);
    return undefined;
  }
  return row.value;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const db = await getDb();
  const expires = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;
  await db.run(
    "INSERT INTO kv (key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at",
    [key, value, expires]
  );
}

export async function kvDel(key: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM kv WHERE key = ?", [key]);
}

export async function audit(actor: string, action: string, detail?: string): Promise<void> {
  const db = await getDb();
  await db.run("INSERT INTO audit (id, created_at, actor, action, detail) VALUES (?, ?, ?, ?, ?)", [
    crypto.randomUUID(),
    new Date().toISOString(),
    actor,
    action,
    detail ?? null
  ]);
}
