import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { cfg, nowIso } from "./config";
import { decrypt, encrypt } from "./crypto";
import { getDb, kvGet, kvSet, parseJson } from "./db";
import { agentEnv } from "./guardrails";

/*
 * Provedores de IA da Central (tela /provedores).
 *  - claude:     conta de assinatura Claude. Cada conta tem a própria pasta de login
 *                (CLAUDE_CONFIG_DIR) dentro da pasta de dados; a "conta da máquina" usa o
 *                login padrão do Claude Code. O login é o fluxo oficial (`claude auth login`).
 *  - claude-api: chave de API da Anthropic, guardada cifrada (chave mestra fora do banco).
 *  - codex:      ChatGPT pelo Codex CLI oficial (assinatura, login por código de
 *                dispositivo) ou chave da OpenAI; pasta própria (CODEX_HOME).
 * Nenhum valor de login passa por arquivo do repositório. As pastas ficam na pasta de
 * dados, que os agentes não leem (lib/guardrails.ts).
 */

export type ProviderKind = "claude" | "claude-api" | "codex";
export type ProviderInfo = { loggedIn?: boolean; email?: string; plan?: string; detail?: string; checkedAt?: string; limitedUntil?: string };
export type Provider = {
  id: string;
  kind: ProviderKind;
  name: string;
  priority: number;
  enabled: boolean;
  home: string | null;
  hasSecret: boolean;
  info: ProviderInfo;
  created_at: string;
};

type Row = { id: string; kind: ProviderKind; name: string; priority: number; enabled: number; home: string | null; secret_enc: string | null; info: string | null; created_at: string };

export const MACHINE_ID = "maquina";
export const KIND_LABEL: Record<ProviderKind, string> = { claude: "Claude · assinatura", "claude-api": "Claude · chave de API", codex: "ChatGPT · Codex" };

const toProvider = (r: Row): Provider => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  priority: Number(r.priority),
  enabled: Boolean(Number(r.enabled)),
  home: r.home,
  hasSecret: Boolean(r.secret_enc),
  info: parseJson<ProviderInfo>(r.info, {}),
  created_at: r.created_at
});

function providersDir(kind: "contas" | "codex"): string {
  const dir = path.join(cfg().dataDir, kind);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

async function ensureMachine(): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ id: string }>("SELECT id FROM providers WHERE id = ?", [MACHINE_ID]);
  if (!row) {
    await db.run("INSERT INTO providers (id, kind, name, priority, enabled, home, secret_enc, info, created_at) VALUES (?, 'claude', ?, 0, 1, NULL, NULL, '{}', ?)", [
      MACHINE_ID,
      "Conta da máquina",
      nowIso()
    ]);
  }
}

/** O que a tela vê de um provedor: nunca a chave nem a pasta de login. */
export function publicProvider(p: Provider): Omit<Provider, "home"> {
  const { home: _home, ...rest } = p;
  void _home;
  return rest;
}

export async function listProviders(): Promise<Provider[]> {
  await ensureMachine();
  const db = await getDb();
  return (await db.all<Row>("SELECT * FROM providers ORDER BY priority, created_at")).map(toProvider);
}

export async function getProvider(id: string): Promise<Provider | undefined> {
  await ensureMachine();
  const db = await getDb();
  const r = await db.get<Row>("SELECT * FROM providers WHERE id = ?", [id]);
  return r ? toProvider(r) : undefined;
}

async function secretOf(id: string): Promise<string> {
  const db = await getDb();
  const r = await db.get<{ secret_enc: string | null }>("SELECT secret_enc FROM providers WHERE id = ?", [id]);
  return r?.secret_enc ? decrypt(r.secret_enc) : "";
}

export async function createProvider(input: { kind: ProviderKind; name: string; apiKey?: string }): Promise<Provider> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const name = input.name.trim().slice(0, 60) || KIND_LABEL[input.kind];
  let home: string | null = null;
  if (input.kind === "claude" || input.kind === "claude-api") home = path.join(providersDir("contas"), id);
  if (input.kind === "codex") home = path.join(providersDir("codex"), id);
  if (home) fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  const key = (input.apiKey ?? "").trim();
  if (input.kind === "claude-api" && !/^sk-ant-/.test(key)) throw new Error("Cole uma chave de API da Anthropic (começa com sk-ant-).");
  const max = await db.get<{ m: number | null }>("SELECT MAX(priority) AS m FROM providers");
  await db.run("INSERT INTO providers (id, kind, name, priority, enabled, home, secret_enc, info, created_at) VALUES (?, ?, ?, ?, 1, ?, ?, '{}', ?)", [
    id,
    input.kind,
    name,
    Number(max?.m ?? 0) + 1,
    home,
    input.kind === "claude-api" ? encrypt(key) : null,
    nowIso()
  ]);
  // Chave da OpenAI: o próprio Codex guarda, na pasta dele (fluxo oficial `codex login --with-api-key`).
  if (input.kind === "codex" && key) {
    const r = await runCodexCli(home!, ["login", "--with-api-key"], key + "\n");
    if (r.code !== 0) {
      await deleteProvider(id);
      throw new Error(`O Codex recusou a chave: ${r.out.split("\n").filter(Boolean).slice(-1)[0] ?? "erro"}`);
    }
  }
  return (await getProvider(id))!;
}

export async function updateProvider(id: string, patch: { name?: string; enabled?: boolean; priority?: number }): Promise<void> {
  const db = await getDb();
  if (patch.name !== undefined) await db.run("UPDATE providers SET name = ? WHERE id = ?", [patch.name.trim().slice(0, 60), id]);
  if (patch.enabled !== undefined) await db.run("UPDATE providers SET enabled = ? WHERE id = ?", [patch.enabled ? 1 : 0, id]);
  if (patch.priority !== undefined) await db.run("UPDATE providers SET priority = ? WHERE id = ?", [patch.priority, id]);
}

/** Sobe ou desce um provedor na ordem de uso, trocando de lugar com o vizinho do mesmo tipo de motor. */
export async function moveProvider(id: string, dir: -1 | 1): Promise<void> {
  const list = await listProviders();
  const i = list.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const reordered = [...list];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  const db = await getDb();
  for (const [n, p] of reordered.entries()) await db.run("UPDATE providers SET priority = ? WHERE id = ?", [n, p.id]);
}

export async function deleteProvider(id: string): Promise<void> {
  if (id === MACHINE_ID) throw new Error("A conta da máquina não sai da lista; dá para desligar.");
  const p = await getProvider(id);
  const db = await getDb();
  await db.run("DELETE FROM providers WHERE id = ?", [id]);
  const root = cfg().dataDir + path.sep;
  if (p?.home && p.home.startsWith(root)) fs.rmSync(p.home, { recursive: true, force: true });
}

export async function saveInfo(id: string, info: ProviderInfo): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE providers SET info = ? WHERE id = ?", [JSON.stringify({ ...info, checkedAt: nowIso() }), id]);
}

export async function markLimited(id: string, resetsAt?: number): Promise<void> {
  const p = await getProvider(id);
  if (!p) return;
  const until = resetsAt ? new Date(resetsAt * 1000).toISOString() : new Date(Date.now() + 60 * 60_000).toISOString();
  await saveInfo(id, { ...p.info, limitedUntil: until });
}

/* ---------- troca automática quando uma conta bate o limite ---------- */

export async function failoverOn(): Promise<boolean> {
  return (await kvGet("provedores.trocar")) !== "0";
}
export async function setFailover(on: boolean): Promise<void> {
  await kvSet("provedores.trocar", on ? "1" : "0");
}

/* ---------- ambiente de cada conta ---------- */

/** Variáveis que fazem o Claude Code usar esta conta (somadas ao ambiente do agente). */
export async function claudeEnvFor(p: Provider): Promise<Record<string, string>> {
  if (p.kind === "claude-api") return { ANTHROPIC_API_KEY: await secretOf(p.id), CLAUDE_CONFIG_DIR: p.home! };
  if (p.kind === "claude" && p.home) return { CLAUDE_CONFIG_DIR: p.home };
  return {};
}

/** Contas Claude ligadas, na ordem de uso; as que estão no limite vão para o fim. */
export async function claudeChain(prefer?: string | null): Promise<Provider[]> {
  const now = nowIso();
  const all = (await listProviders()).filter((p) => p.enabled && (p.kind === "claude" || p.kind === "claude-api") && p.info.loggedIn !== false);
  const preferred = prefer ? all.filter((p) => p.id === prefer) : [];
  const rest = all.filter((p) => p.id !== prefer);
  const free = rest.filter((p) => !p.info.limitedUntil || p.info.limitedUntil < now);
  const limited = rest.filter((p) => p.info.limitedUntil && p.info.limitedUntil >= now);
  const chain = [...preferred, ...free, ...limited];
  return chain.length ? chain : [(await getProvider(MACHINE_ID))!];
}

/* ---------- binários oficiais ---------- */

const PLATFORM = `${process.platform}-${process.arch}`;

export function claudeBin(): string {
  if (cfg().claudePath) return cfg().claudePath;
  const base = path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "@anthropic-ai");
  for (const pkg of [`claude-agent-sdk-${PLATFORM}`, `claude-agent-sdk-${PLATFORM}-musl`]) {
    const file = path.join(base, pkg, process.platform === "win32" ? "claude.exe" : "claude");
    if (fs.existsSync(file)) return file;
  }
  return "claude";
}

export function codexJs(): string | null {
  const candidates = [
    process.env.CENTRAL_CODEX_JS,
    path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "@openai", "codex", "bin", "codex.js"),
    "/data/OpenBot/Shared/tools/codex/node_modules/@openai/codex/bin/codex.js"
  ].filter((s): s is string => Boolean(s));
  return candidates.find((f) => fs.existsSync(f)) ?? null;
}

export function baseEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["PATH", "HOME", "LANG", "TMPDIR", "SystemRoot", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE"]) {
    if (process.env[k]) out[k] = process.env[k]!;
  }
  return out;
}

export function runCodexCli(home: string, args: string[], stdin = ""): Promise<{ code: number; out: string }> {
  const js = codexJs();
  if (!js) return Promise.resolve({ code: 127, out: "Codex CLI não instalado (npm i @openai/codex na pasta ui)." });
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [js, ...args], { env: { ...baseEnv(), CODEX_HOME: home } as unknown as NodeJS.ProcessEnv, timeout: 30_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : 1) : 0;
      resolve({ code, out: `${stdout}\n${stderr}`.replace(/\x1b\[[0-9;]*m/g, "") });
    });
    if (stdin) child.stdin?.end(stdin);
    else child.stdin?.end();
  });
}

/* ---------- conferir login ---------- */

export async function checkProvider(id: string): Promise<ProviderInfo> {
  const p = await getProvider(id);
  if (!p) throw new Error("Provedor não encontrado.");
  let info: ProviderInfo;
  if (p.kind === "codex") {
    const r = await runCodexCli(p.home!, ["login", "status"]);
    const text = r.out.trim();
    const logged = /logged in/i.test(text) && !/not logged in/i.test(text);
    info = { loggedIn: logged, plan: /chatgpt/i.test(text) ? "assinatura ChatGPT" : /api key/i.test(text) ? "chave de API" : undefined, detail: text.split("\n").filter((l) => l && !/WARNING/.test(l)).slice(-1)[0]?.slice(0, 160) };
  } else {
    info = await claudeAccountInfo(await claudeEnvFor(p));
  }
  await saveInfo(id, { ...info, limitedUntil: p.info.limitedUntil });
  return info;
}

/** Lê a conta logada sem chamar o modelo (não gasta uso). */
async function claudeAccountInfo(extra: Record<string, string>): Promise<ProviderInfo> {
  const ac = new AbortController();
  async function* idle() {
    await new Promise<void>((resolve) => ac.signal.addEventListener("abort", () => resolve(), { once: true }));
  }
  try {
    const q = query({
      prompt: idle() as never,
      options: { abortController: ac, settingSources: [], tools: [], env: { ...agentEnv(), ...extra }, ...(cfg().claudePath ? { pathToClaudeCodeExecutable: cfg().claudePath } : {}) }
    });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sem resposta do Claude Code")), 20_000));
    const a = await Promise.race([q.accountInfo(), timeout]);
    const logged = Boolean(a.email || (a.apiKeySource && a.apiKeySource !== "none") || (a.tokenSource && a.tokenSource !== "none"));
    return { loggedIn: logged, email: a.email, plan: a.subscriptionType ?? (a.apiKeySource && a.apiKeySource !== "none" ? "chave de API" : undefined) };
  } catch (e) {
    return { loggedIn: false, detail: e instanceof Error ? e.message.slice(0, 160) : "erro" };
  } finally {
    ac.abort();
  }
}
