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
const g = globalThis as unknown as { __centralVault?: Map<string, string>; __centralVaultLoaded?: Promise<void> };

export async function loadVault(force = false): Promise<void> {
  if (!force && g.__centralVaultLoaded) return g.__centralVaultLoaded;
  g.__centralVaultLoaded = (async () => {
    const db = await getDb();
    const rows = await db.all<{ name: string; value_enc: string }>("SELECT name, value_enc FROM secrets");
    const map = new Map<string, string>();
    for (const r of rows) {
      try {
        map.set(r.name, decrypt(r.value_enc));
      } catch {
        /* chave mestra trocada: ignora o valor ilegível */
      }
    }
    g.__centralVault = map;
  })();
  return g.__centralVaultLoaded;
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

export async function listSecretNames(): Promise<{ name: string; updated_at: string; last_used_at: string | null }[]> {
  const db = await getDb();
  return db.all("SELECT name, updated_at, last_used_at FROM secrets ORDER BY name");
}

export async function markUsed(name: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE secrets SET last_used_at = ? WHERE name = ?", [nowIso(), name]).catch(() => undefined);
}
