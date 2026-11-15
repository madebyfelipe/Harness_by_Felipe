import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { migrate, MIGRATIONS } from "../lib/db/migrations";
import { wrapPostgres } from "../lib/db/postgres";
import { openSqlite } from "../lib/db/sqlite";
import type { Db } from "../lib/db/types";

/** O mesmo roteiro nos dois bancos: é o que garante "a mesma camada de acesso". */
async function roteiro(db: Db) {
  assert.deepEqual(await migrate(db), MIGRATIONS.map((m) => m.id));
  assert.deepEqual(await migrate(db), [], "migrar de novo não faz nada");

  const now = new Date().toISOString();
  await db.run("INSERT INTO users (id, name, password_hash, totp_secret_enc, totp_last_counter, created_at) VALUES (?, ?, ?, ?, 0, ?)", ["u1", "Felipe", "h", "s", now]);
  await db.run("INSERT INTO conversations (id, title, mode, agent, model, sdk_session_id, allowed_tools, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, '[]', 0, ?, ?)", ["c1", "Oi?", "chat", "orquestrador", "claude-fable-5-2", now, now]);
  await db.run("INSERT INTO messages (id, conversation_id, run_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", ["m1", "c1", null, "user", "É 'isso'? Sim.", JSON.stringify({ a: 1 }), now]);
  const msg = await db.get<{ content: string; meta: string; run_id: string | null }>("SELECT content, meta, run_id FROM messages WHERE id = ?", ["m1"]);
  assert.equal(msg!.content, "É 'isso'? Sim.");
  assert.equal(JSON.parse(msg!.meta).a, 1);
  assert.equal(msg!.run_id, null);

  const upsert = "INSERT INTO kv (key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at";
  await db.run(upsert, ["k", "1", null]);
  await db.run(upsert, ["k", "2", null]);
  assert.equal((await db.get<{ value: string }>("SELECT value FROM kv WHERE key = ?", ["k"]))!.value, "2");

  await db.run("INSERT INTO runs (id, conversation_id, agent, model, origin, status, input, tools, cost_usd, started_at) VALUES (?, ?, ?, ?, ?, 'running', ?, '[]', ?, ?)", ["r1", "c1", "orquestrador", "m", "chat", "oi", 0.0123, now]);
  assert.ok(Math.abs(Number((await db.get<{ cost_usd: number }>("SELECT cost_usd FROM runs WHERE id = ?", ["r1"]))!.cost_usd) - 0.0123) < 1e-9);

  const changed = await db.run("UPDATE conversations SET archived = 1 WHERE id = ?", ["c1"]);
  assert.equal(changed.changes, 1);
  assert.equal((await db.run("UPDATE conversations SET archived = 1 WHERE id = ?", ["nao-existe"])).changes, 0);
  const count = await db.get<{ n: number | string }>("SELECT COUNT(*) AS n FROM conversations WHERE archived = ? AND mode = ?", [1, "chat"]);
  assert.equal(Number(count!.n), 1);
  const rows = await db.all<{ id: string }>("SELECT id FROM conversations WHERE id IN (?, ?) ORDER BY id LIMIT ?", ["c1", "c2", 5]);
  assert.deepEqual(rows.map((r) => r.id), ["c1"]);
  await db.close();
}

test("SQLite (modo local)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "central-db-"));
  await roteiro(openSqlite(path.join(dir, "t.db")));
});

test("Postgres (modo VPS) — dialeto real, em memória", async () => {
  await roteiro(wrapPostgres(new PGlite() as never));
});
