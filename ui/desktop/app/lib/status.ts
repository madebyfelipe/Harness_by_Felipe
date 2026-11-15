import { cfg } from "./config";
import { getDb } from "./db";
import { repoStatus } from "./git";
import { repoHealth } from "./repo";
import { runningCount } from "./runner";

export type WorkerRow = { id: string; mode: string; host: string; pid: number; started_at: string; last_seen_at: string; info: string | null };

/** Worker que bateu ponto há menos de 45 s conta como online. */
export const WORKER_FRESH_MS = 45_000;

export async function listWorkers(): Promise<(WorkerRow & { online: boolean })[]> {
  const db = await getDb();
  const rows = await db.all<WorkerRow>("SELECT * FROM workers ORDER BY last_seen_at DESC LIMIT 5");
  const now = Date.now();
  return rows.map((r) => ({ ...r, online: now - new Date(r.last_seen_at).getTime() < WORKER_FRESH_MS }));
}

async function peerAlive(url: string): Promise<boolean | null> {
  if (!url) return null;
  try {
    const res = await fetch(new URL("/api/health", url), { signal: AbortSignal.timeout(4000), redirect: "manual" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getStatus() {
  const c = cfg();
  const [workers, peer, repo] = await Promise.all([listWorkers(), peerAlive(c.peerUrl), repoStatus().catch(() => null)]);
  return {
    mode: c.mode,
    database: c.databaseUrl ? "postgres" : "sqlite",
    worker: workers.find((w) => w.online) ?? null,
    lastWorker: workers[0] ?? null,
    peer: c.peerUrl ? { url: c.peerUrl, mode: c.mode === "vps" ? "local" : "vps", alive: peer } : null,
    repo,
    repoHealth: repoHealth(),
    running: runningCount(),
    modelAuth: process.env.ANTHROPIC_API_KEY ? "chave de API" : process.env.CLAUDE_CODE_OAUTH_TOKEN ? "token da assinatura" : "login do Claude Code desta máquina"
  };
}
