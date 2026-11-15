import { nowIso } from "./config";
import { decrypt, encrypt } from "./crypto";
import { getDb } from "./db";

/*
 * Cofre da Central: valores de segredo cifrados (AES-GCM, chave mestra fora do banco).
 * O valor nunca volta para a tela depois de salvo. Leitura síncrona por cache em
 * memória, carregado no início e a cada gravação; quem precisa do valor chama
 * `loadVault()` antes (rota, runner, agenda).
 */

const SECRET_RE = /^[A-Z][A-Z0-9_]{2,63}$/;
const g = globalThis as unknown as { __centralVault?: Map<string, string>; __centralScopes?: Map<string, string[] | null>; __centralVaultLoaded?: Promise<void> };

export async function loadVault(force = false): Promise<void> {
  if (!force && g.__centralVaultLoaded) return g.__centralVaultLoaded;
  g.__centralVaultLoaded = (async () => {
    const db = await getDb();
    const rows = await db.all<{ name: string; value_enc: string; agents: string | null }>("SELECT name, value_enc, agents FROM secrets");
    const map = new Map<string, string>();
    const scopes = new Map<string, string[] | null>();
    for (const r of rows) {
      try {
        map.set(r.name, decrypt(r.value_enc));
        scopes.set(r.name, parseAgents(r.agents));
      } catch {
        /* chave mestra trocada: ignora o valor ilegível */
      }
    }
    g.__centralVault = map;
    g.__centralScopes = scopes;
  })();
  return g.__centralVaultLoaded;
}

function parseAgents(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length && !list.includes("*") ? list.map(String) : null;
  } catch {
    return null;
  }
}

/** O agente pode usar este segredo? Sem escopo definido = todos. Segredo fora do cofre (variável de ambiente) = todos. */
export function secretAllowed(name: string, agent: string): boolean {
  const scope = g.__centralScopes?.get(name);
  return !scope || scope.includes(agent);
}

/** Define quem pode usar: lista de agentes, ou null/["*"] para todos. */
export async function setScope(name: string, agents: string[] | null): Promise<void> {
  const list = agents && agents.length && !agents.includes("*") ? [...new Set(agents.map((a) => a.trim()).filter(Boolean))] : null;
  const db = await getDb();
  await db.run("UPDATE secrets SET agents = ? WHERE name = ?", [list ? JSON.stringify(list) : null, name]);
  await loadVault(true);
}

/** Registro de uso: quem usou qual segredo e onde. Nunca o valor. */
export async function logUse(name: string, agent: string, onde: string): Promise<void> {
  const db = await getDb();
  await db.run("INSERT INTO secret_uses (id, name, agent, onde, used_at) VALUES (?, ?, ?, ?, ?)", [crypto.randomUUID(), name, agent, onde.slice(0, 200), nowIso()]).catch(() => undefined);
  await db.run("UPDATE secrets SET last_used_at = ? WHERE name = ?", [nowIso(), name]).catch(() => undefined);
}

export async function recentUses(limit = 30): Promise<{ name: string; agent: string; onde: string; used_at: string }[]> {
  const db = await getDb();
  return db.all("SELECT name, agent, onde, used_at FROM secret_uses ORDER BY used_at DESC LIMIT ?", [limit]);
}

const REF_RE = /\{\{vault:([A-Z][A-Z0-9_]{2,63})\}\}/g;

/** Nomes citados como {{vault:NOME}} num texto. */
export function vaultRefs(text: string): string[] {
  return [...new Set([...text.matchAll(REF_RE)].map((m) => m[1]))];
}

/**
 * Troca {{vault:NOME}} pelo valor, só para o agente que está no escopo. Devolve o erro
 * (sem valor nenhum) se algum nome não existe ou o agente não pode usá-lo.
 */
export function injectVault(text: string, agent: string): { text: string; used: string[]; error?: string } {
  const used: string[] = [];
  let error: string | undefined;
  const out = text.replace(REF_RE, (whole, name: string) => {
    const value = g.__centralVault?.get(name);
    if (!value) error = `o segredo ${name} não está no cofre (peça com pedir_acesso)`;
    else if (!secretAllowed(name, agent)) error = `o agente ${agent} não está no escopo do segredo ${name} (o Felipe libera em Configurações → Cofre)`;
    if (error || !value) return whole;
    used.push(name);
    return value;
  });
  return error ? { text, used: [], error } : { text: out, used };
}

/** Tira de um texto qualquer valor que esteja no cofre (antes de devolver algo ao modelo ou à tela). */
export function scrubSecrets(text: string): string {
  let out = text;
  for (const value of g.__centralVault?.values() ?? []) if (value.length >= 6 && out.includes(value)) out = out.split(value).join("•••");
  return out;
}

/** Valor do cofre já carregado (ou undefined). */
export function vaultValue(name: string): string | undefined {
  return g.__centralVault?.get(name);
}

export async function setSecret(name: string, value: string): Promise<void> {
  if (!SECRET_RE.test(name)) throw new Error("Nome do segredo: maiúsculas, números e _ (ex.: EVOLUTION_API_KEY).");
  const v = value.trim();
  if (!v || v.length > 8000) throw new Error("Valor vazio ou grande demais.");
  const db = await getDb();
  await db.run(
    "INSERT INTO secrets (name, value_enc, updated_at) VALUES (?, ?, ?) ON CONFLICT (name) DO UPDATE SET value_enc = excluded.value_enc, updated_at = excluded.updated_at",
    [name, encrypt(v), nowIso()]
  );
  await loadVault(true);
}

export async function deleteSecret(name: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM secrets WHERE name = ?", [name]);
  await loadVault(true);
}

export async function listSecretNames(): Promise<{ name: string; updated_at: string; last_used_at: string | null; agents: string[] | null }[]> {
  const db = await getDb();
  const rows = await db.all<{ name: string; updated_at: string; last_used_at: string | null; agents: string | null }>("SELECT name, updated_at, last_used_at, agents FROM secrets ORDER BY name");
  return rows.map((r) => ({ ...r, agents: parseAgents(r.agents) }));
}

export async function markUsed(name: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE secrets SET last_used_at = ? WHERE name = ?", [nowIso(), name]).catch(() => undefined);
}
