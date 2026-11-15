import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cfg } from "./config";
import { sensitiveDirs } from "./guardrails";

/*
 * Caminhos de trabalho.
 *  - A pasta de configuração (repositório) continua sendo o chão da Central.
 *  - Cada projeto tem uma pasta própria, criada sozinha ou escolhida pelo Felipe.
 *  - Fora dessas pastas, ler/escrever pede aprovação; segredos nunca.
 */

export function expandPath(input: string, base = process.cwd()): string {
  const t = String(input ?? "").trim();
  if (!t) return "";
  if (t === "~") return os.homedir();
  if (t.startsWith("~/") || t.startsWith("~\\")) return path.resolve(path.join(os.homedir(), t.slice(2)));
  return path.resolve(/* turbopackIgnore: true */ base, t);
}

export function insideAny(abs: string, dirs: string[]): boolean {
  return dirs.some((d) => d && (abs === d || abs.startsWith(d + path.sep)));
}

/** Pasta onde ficam os projetos criados automaticamente (`CENTRAL_PROJECTS_DIR` muda). */
export function projectsRoot(): string {
  return cfg().projectsDir;
}

export function ensureProjectsRoot(): string {
  const root = projectsRoot();
  fs.mkdirSync(root, { recursive: true, mode: 0o755 });
  return root;
}

/** Pastas que nunca podem virar pasta de projeto (segredos da Central e do sistema). */
export function forbiddenFolders(dataDir = cfg().dataDir): string[] {
  return sensitiveDirs(dataDir);
}

/** Motivo para recusar uma pasta de projeto, ou null se serve. */
export function folderRefused(abs: string, dataDir = cfg().dataDir): string | null {
  if (!abs || !path.isAbsolute(abs)) return "o caminho precisa ser absoluto";
  if (abs.length > 400) return "o caminho é longo demais";
  if (abs === path.parse(abs).root) return "a raiz do disco não pode ser pasta de projeto";
  if (insideAny(abs, [dataDir])) return "essa pasta guarda os dados e segredos da Central";
  const secrets = sensitiveDirs(dataDir).filter((d) => d !== dataDir);
  if (insideAny(abs, secrets)) return "essa pasta guarda segredos do sistema";
  return null;
}

/** Valida e devolve o caminho absoluto de uma pasta de projeto; recusa segredos. */
export function validateProjectFolder(input: string, dataDir = cfg().dataDir): string {
  const raw = String(input ?? "").trim();
  if (!raw || (!raw.startsWith("/") && !raw.startsWith("~") && !/^[A-Za-z]:[\\/]/.test(raw))) throw new Error("O caminho da pasta precisa ser absoluto.");
  const abs = expandPath(raw);
  if (!abs) throw new Error("Escolha uma pasta para o projeto.");
  const why = folderRefused(abs, dataDir);
  if (why) throw new Error(`Não posso usar essa pasta: ${why}.`);
  return abs;
}

/** Cria a pasta (e os pais) e devolve o caminho. Lança erro legível. */
export function ensureFolder(abs: string): string {
  try {
    fs.mkdirSync(abs, { recursive: true, mode: 0o755 });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "";
    const why = code === "EACCES" || code === "EPERM" ? "sem permissão de escrita" : code === "ENOTDIR" ? "o caminho passa por um arquivo" : "não consegui criar";
    throw new Error(`Pasta ${abs}: ${why}.`);
  }
  return abs;
}

/** Pastas liberadas para o agente, além da pasta do projeto e do repositório. */
export function extraAllowedDirs(): string[] {
  return cfg().allowedDirs;
}

/** Raízes em que o agente trabalha sem pedir aprovação: pasta do projeto, repo, liberadas, anexos e /tmp. */
export function sandboxRoots(projectFolder: string | null | undefined, dataDir = cfg().dataDir): string[] {
  const roots = [projectFolder ?? "", cfg().repoDir, ...extraAllowedDirs(), path.join(dataDir, "uploads"), "/tmp"].filter(Boolean);
  const seen = new Set<string>();
  return roots.filter((d) => {
    const real = (() => {
      try {
        return fs.realpathSync(d);
      } catch {
        return path.resolve(d);
      }
    })();
    if (seen.has(real)) return false;
    seen.add(real);
    return true;
  });
}

/** Subpastas visíveis para o seletor de pastas. */
export function listSubfolders(abs: string): { nome: string; caminho: string }[] {
  const out: { nome: string; caminho: string }[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    const full = path.join(abs, entry.name);
    try {
      if (!fs.statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    out.push({ nome: entry.name, caminho: full });
    if (out.length >= 500) break;
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}
