/*
 * Worker da Central. Na Fase 1 ele faz duas coisas:
 *  1. bate ponto no banco, para a barra do topo mostrar qual worker está online;
 *  2. traz do git a configuração que a outra instância publicou (VPS ↔ local).
 * O agendador de rotinas (cron em America/Sao_Paulo) entra aqui na Fase 3.
 *
 * Rodar: npm run worker
 */
import os from "node:os";
import { cfg, nowIso } from "../lib/config";
import { getDb } from "../lib/db";
import { pullConfig } from "../lib/git";

const HEARTBEAT_MS = 15_000;
const SYNC_MS = 5 * 60_000;

async function main() {
  const c = cfg();
  const db = await getDb();
  const id = `${c.mode}-${os.hostname()}`;
  const started = nowIso();
  let lastSync = "";

  const beat = async () => {
    await db.run(
      "INSERT INTO workers (id, mode, host, pid, started_at, last_seen_at, info) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET mode = excluded.mode, pid = excluded.pid, started_at = excluded.started_at, last_seen_at = excluded.last_seen_at, info = excluded.info",
      [id, c.mode, os.hostname(), process.pid, started, nowIso(), lastSync || null]
    );
  };
  const sync = async () => {
    if (process.env.CENTRAL_GIT_SYNC !== "1") return;
    const r = await pullConfig();
    lastSync = `git: ${r.ok ? "ok" : "falhou"} ${r.note}`.slice(0, 200);
    if (!r.ok) console.error(`[worker] ${lastSync}`);
  };

  await sync();
  await beat();
  console.log(`[worker] ${id} online (modo ${c.mode}, fuso de trabalho ${c.tz}, pid ${process.pid})`);
  const t1 = setInterval(() => void beat().catch((e) => console.error("[worker] batida falhou:", e)), HEARTBEAT_MS);
  const t2 = setInterval(() => void sync().catch((e) => console.error("[worker] sync falhou:", e)), SYNC_MS);

  const stop = async () => {
    clearInterval(t1);
    clearInterval(t2);
    // Marca como visto há muito tempo: a barra do topo mostra "offline" na hora.
    await db.run("UPDATE workers SET last_seen_at = ? WHERE id = ?", [new Date(0).toISOString(), id]).catch(() => undefined);
    await db.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
}

main().catch((e) => {
  console.error("[worker] não subiu:", e);
  process.exit(1);
});
