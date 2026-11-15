import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { commitPaths, type CommitResult } from "./git";
import { MODELS } from "./models";
import { getAgent, listSkills, ORCHESTRATOR, repoDir } from "./repo";

/*
 * Criar, editar, pausar e excluir agentes (agents/<nome>.md) e habilidades
 * (skills/<nome>/SKILL.md). Tudo vira arquivo + commit: o repositório segue sendo a
 * fonte única. Chaves do cabeçalho que a tela não conhece são preservadas.
 */

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const TOOL_RE = /^([A-Za-z][A-Za-z0-9]*|mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_*-]+)$/;
/** Sem estes a Central não funciona: dá para editar, não para excluir nem pausar. */
export const PROTECTED = [ORCHESTRATOR, "triagem", "guardiao"];

export type AgentInput = { name: string; description: string; model: string; tools: string[]; prompt: string; paused: boolean };

export function normalizeAgent(raw: unknown): AgentInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = String(r.name ?? "").trim();
  if (!NAME_RE.test(name)) throw new Error("Nome: minúsculas, números e hífen (2 a 40).");
  const description = String(r.description ?? "").trim().replace(/\s+/g, " ");
  if (description.length < 10 && name !== ORCHESTRATOR) throw new Error("Papel: descreva em uma frase quando usar este agente (a triagem lê isto).");
  const alias = String(r.model ?? "sonnet").trim().toLowerCase();
  const model = MODELS.find((m) => m.alias === alias || m.id === alias);
  if (!model) throw new Error(`Modelo desconhecido: ${alias}.`);
  const tools = (Array.isArray(r.tools) ? r.tools.map(String) : String(r.tools ?? "").split(/[,\n]/)).map((t) => t.trim()).filter(Boolean);
  const bad = tools.find((t) => !TOOL_RE.test(t));
  if (bad) throw new Error(`Ferramenta inválida: "${bad}". Use nomes como Read, Bash ou mcp__Servidor__ferramenta.`);
  const prompt = String(r.prompt ?? "").trim();
  if (prompt.length < 20) throw new Error("Prompt: escreva as instruções do agente.");
  if (prompt.length > 60_000) throw new Error("Prompt grande demais (máx. 60 mil caracteres).");
  const paused = r.paused === true;
  if (paused && PROTECTED.includes(name)) throw new Error(`O agente ${name} não pode ser pausado: a Central depende dele.`);
  return { name, description: description.slice(0, 600), model: model.alias, tools: [...new Set(tools)], prompt, paused };
}

export async function saveAgent(a: AgentInput, who: string, isNew: boolean): Promise<CommitResult> {
  const rel = `agents/${a.name}.md`;
  const abs = path.join(repoDir(), rel);
  const exists = fs.existsSync(abs);
  if (isNew && (exists || getAgent(a.name))) throw new Error("Já existe um agente com esse nome.");
  if (!isNew && !exists) throw new Error("Agente não encontrado.");
  const old = exists ? parseFrontmatter(fs.readFileSync(abs, "utf8")) : null;
  let text: string;
  if (old && !old.hasFrontmatter) {
    // O orquestrador é o prompt da sessão principal: arquivo sem cabeçalho, só o texto.
    text = a.prompt + "\n";
  } else {
    const data: Record<string, unknown> = { ...(old?.data ?? {}), name: a.name, description: a.description, model: a.model };
    if (a.tools.length) data.tools = a.tools.join(", ");
    else delete data.tools;
    if (a.paused) data.pausado = true;
    else delete data.pausado;
    text = stringifyFrontmatter(data, a.prompt + "\n");
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
  return commitPaths([rel], `central: agente ${a.name} ${isNew ? "criado" : "editado"} (${who})`);
}

export async function deleteAgent(name: string, who: string): Promise<CommitResult> {
  if (PROTECTED.includes(name)) throw new Error(`O agente ${name} não pode ser excluído: a Central depende dele.`);
  const a = getAgent(name);
  if (!a) throw new Error("Agente não encontrado.");
  fs.rmSync(path.join(repoDir(), a.file), { force: true });
  return commitPaths([a.file], `central: agente ${name} excluído (${who})`);
}

/* ---------- habilidades ---------- */

export type SkillInput = { name: string; description: string; body: string };

export function normalizeSkill(raw: unknown): SkillInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = String(r.name ?? "").trim();
  if (!NAME_RE.test(name)) throw new Error("Nome: minúsculas, números e hífen (2 a 40).");
  const description = String(r.description ?? "").trim().replace(/\s+/g, " ");
  if (description.length < 10) throw new Error("Descrição: diga quando usar esta habilidade (o agente decide por ela).");
  const body = String(r.body ?? "").trim();
  if (body.length < 20) throw new Error("Conteúdo: escreva o passo a passo.");
  if (body.length > 60_000) throw new Error("Conteúdo grande demais (máx. 60 mil caracteres).");
  return { name, description: description.slice(0, 600), body };
}

const skillRel = (name: string) => `skills/${name}/SKILL.md`;

export async function saveSkill(s: SkillInput, who: string, isNew: boolean): Promise<CommitResult> {
  const rel = skillRel(s.name);
  const abs = path.join(repoDir(), rel);
  const exists = fs.existsSync(abs);
  if (isNew && exists) throw new Error("Já existe uma habilidade com esse nome.");
  if (!isNew && !exists) throw new Error("Habilidade não encontrada.");
  const old = exists ? parseFrontmatter(fs.readFileSync(abs, "utf8")).data : {};
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, stringifyFrontmatter({ ...old, name: s.name, description: s.description }, s.body + "\n"));
  return commitPaths([rel], `central: habilidade ${s.name} ${isNew ? "criada" : "editada"} (${who})`);
}

export async function deleteSkill(name: string, who: string): Promise<CommitResult> {
  if (!NAME_RE.test(name) || !listSkills().some((s) => s.file === skillRel(name))) throw new Error("Habilidade não encontrada.");
  const dir = path.join(repoDir(), "skills", name);
  // Só o SKILL.md é da Central; se a pasta tiver outros arquivos, eles ficam.
  fs.rmSync(path.join(dir, "SKILL.md"), { force: true });
  try {
    if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  } catch {
    /* pasta com outros arquivos */
  }
  return commitPaths([skillRel(name)], `central: habilidade ${name} excluída (${who})`);
}

/* ---------- importar do OpenBot (rascunhos pausados) ---------- */

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Lê as tabelas de openbot/agentes.md (só as frentes do harness) e devolve os candidatos. */
export function openbotCandidates(): { name: string; papel: string; obs: string; exists: boolean }[] {
  let text = "";
  try {
    text = fs.readFileSync(path.join(repoDir(), "openbot", "agentes.md"), "utf8");
  } catch {
    return [];
  }
  const out: { name: string; papel: string; obs: string; exists: boolean }[] = [];
  let on = false;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) on = /vendas e marketing|atendimento e orquestra/i.test(h[1]);
    if (!on) continue;
    const m = /^\|\s*\*\*(.+?)\*\*[^|]*\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (!m) continue;
    for (const raw of m[1].split(/\*\*\s*e\s*\*\*|,/)) {
      const name = slug(raw.replace(/\(.*?\)/g, ""));
      if (NAME_RE.test(name) && !out.some((o) => o.name === name)) out.push({ name, papel: m[2], obs: m[3], exists: Boolean(getAgent(name)) || fs.existsSync(path.join(repoDir(), "agents", `${name}.md`)) });
    }
  }
  return out;
}

export async function importOpenbot(who: string): Promise<{ created: string[]; commit: CommitResult | null }> {
  const todo = openbotCandidates().filter((c) => !c.exists);
  const paths: string[] = [];
  for (const c of todo) {
    const rel = `agents/${c.name}.md`;
    const prompt = `> Rascunho importado do OpenBot (openbot/agentes.md, snapshot de 14/11/2026). Revise antes de ligar: onde discordar de decisoes.md, vale decisoes.md.\n\nPapel: ${c.papel}\n\nComo trabalhava no OpenBot: ${c.obs || "sem observações."}\n\nFale em português do Brasil, curto e direto. Siga contexto.md e decisoes.md.`;
    fs.writeFileSync(path.join(repoDir(), rel), stringifyFrontmatter({ name: c.name, description: c.papel.slice(0, 300), model: "sonnet", pausado: true }, prompt + "\n"));
    paths.push(rel);
  }
  return { created: todo.map((c) => c.name), commit: paths.length ? await commitPaths(paths, `central: ${paths.length} agente(s) importado(s) do OpenBot como rascunho (${who})`) : null };
}
