import fs from "node:fs";
import path from "node:path";
import { cfg } from "./config";
import { parseFrontmatter, toList } from "./frontmatter";
import { DEFAULT_ORCHESTRATOR_MODEL, resolveModel } from "./models";

/* Tudo que é configuração vive em arquivo neste repositório. A Central lê daqui. */

export const ORCHESTRATOR = "orquestrador";

export type AgentDef = {
  name: string;
  description: string;
  tools: string[];
  model: string;
  ladder: string[];
  prompt: string;
  file: string;
  isOrchestrator: boolean;
  /** Pausado ou rascunho: aparece na tela, mas a triagem e o orquestrador não o usam. */
  paused: boolean;
};

export type SkillDef = { name: string; description: string; file: string; body: string };
export type ContextFile = { file: string; title: string; size: number; updatedAt: string };
export type SearchHit = { file: string; line: number; text: string; heading: string };

const SKIP_DIRS = new Set(["ui", "node_modules", ".git", ".next", ".claude", "data"]);

export function repoDir(): string {
  return cfg().repoDir;
}

/** Caminho relativo → absoluto, só se ficar dentro do repositório e fora de `ui/`. */
export function safeRepoPath(rel: string): string | null {
  if (!rel || rel.includes("\0")) return null;
  const root = repoDir();
  const abs = path.resolve(/* turbopackIgnore: true */ root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  const first = path.relative(root, abs).split(path.sep)[0];
  if (SKIP_DIRS.has(first)) return null;
  return abs;
}

function readIfExists(abs: string): string | null {
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

/* ---------- agentes ---------- */

export function listAgents(): AgentDef[] {
  const dir = path.join(repoDir(), "agents");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const agents: AgentDef[] = [];
  for (const f of files) {
    const text = readIfExists(path.join(dir, f));
    if (text === null) continue;
    const { data, body, hasFrontmatter } = parseFrontmatter(text);
    const base = f.replace(/\.md$/, "");
    const isOrchestrator = base === ORCHESTRATOR;
    if (!hasFrontmatter && !isOrchestrator) continue;
    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : base;
    agents.push({
      name,
      description:
        typeof data.description === "string"
          ? data.description
          : isOrchestrator
            ? "Sessão principal: planeja, delega aos subagentes, revisa e responde ao Felipe."
            : "",
      tools: toList(data.tools),
      model: resolveModel(typeof data.model === "string" ? data.model : undefined, isOrchestrator ? DEFAULT_ORCHESTRATOR_MODEL : "claude-sonnet-5-5"),
      ladder: toList(data.ladder ?? data.escada),
      prompt: body.trim(),
      file: `agents/${f}`,
      isOrchestrator,
      paused: data.pausado === true
    });
  }
  return agents.sort((a, b) => Number(b.isOrchestrator) - Number(a.isOrchestrator) || a.name.localeCompare(b.name));
}

export function getAgent(name: string): AgentDef | undefined {
  return listAgents().find((a) => a.name === name);
}

/* ---------- skills ---------- */

export function listSkills(): SkillDef[] {
  const dir = path.join(repoDir(), "skills");
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return [];
  }
  const skills: SkillDef[] = [];
  for (const n of names) {
    const text = readIfExists(path.join(dir, n, "SKILL.md"));
    if (text === null) continue;
    const { data, body } = parseFrontmatter(text);
    skills.push({
      name: typeof data.name === "string" ? data.name : n,
      description: typeof data.description === "string" ? data.description : "",
      file: `skills/${n}/SKILL.md`,
      body: body.trim()
    });
  }
  return skills;
}

/* ---------- banco de contexto (.md) ---------- */

function walkMd(dir: string, rel: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!rel && SKIP_DIRS.has(e.name)) continue;
      walkMd(path.join(dir, e.name), childRel, out);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      out.push(childRel);
    }
  }
}

function titleOf(text: string, fallback: string): string {
  const { body } = parseFrontmatter(text);
  const m = /^#\s+(.+)$/m.exec(body);
  return m ? m[1].trim() : fallback;
}

export function listContextFiles(): ContextFile[] {
  const root = repoDir();
  const rels: string[] = [];
  walkMd(root, "", rels);
  return rels
    .map((file) => {
      const abs = path.join(root, file);
      const stat = fs.statSync(abs);
      return { file, title: titleOf(readIfExists(abs) ?? "", file), size: stat.size, updatedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => a.file.split("/").length - b.file.split("/").length || a.file.localeCompare(b.file));
}

export function readContextFile(rel: string): string | null {
  if (!rel.toLowerCase().endsWith(".md")) return null;
  const abs = safeRepoPath(rel);
  return abs ? readIfExists(abs) : null;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca literal nos .md, sem modelo: todas as palavras na mesma linha, sem acento. */
export function searchContext(query: string, limit = 60): SearchHit[] {
  const terms = fold(query).split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const { file } of listContextFiles()) {
    const text = readContextFile(file);
    if (!text) continue;
    let heading = "";
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const h = /^#{1,6}\s+(.+)$/.exec(line);
      if (h) heading = h[1].trim();
      const folded = fold(line);
      if (terms.every((t) => folded.includes(t))) {
        hits.push({ file, line: i + 1, text: line.trim().slice(0, 400), heading });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

/* ---------- pastas de configuração em YAML ---------- */

export function listYamlFiles(folder: "connectors" | "routines"): string[] {
  try {
    return fs
      .readdirSync(path.join(repoDir(), folder))
      .filter((f) => /\.ya?ml$/.test(f))
      .sort()
      .map((f) => `${folder}/${f}`);
  } catch {
    return [];
  }
}

export function repoHealth(): { ok: boolean; problems: string[] } {
  const root = repoDir();
  const problems: string[] = [];
  for (const need of ["agents", "contexto.md"]) {
    if (!fs.existsSync(path.join(root, need))) problems.push(`não achei ${need} em ${root}`);
  }
  if (!fs.existsSync(path.join(root, ".git"))) problems.push("a pasta não é um repositório git");
  return { ok: problems.length === 0, problems };
}
