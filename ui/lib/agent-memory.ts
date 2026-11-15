import fs from "node:fs";
import path from "node:path";
import { cfg } from "./config";

/*
 * Memória durável por agente — o que ele aprendeu e não quer reaprender.
 * Fica em arquivo (memoria/<agente>.md) para poder ser lida, revisada e versionada
 * no git, como as habilidades. Curta de propósito: entra no prompt a cada execução.
 * Só entra o que muda o próximo trabalho: fato estável, lição de um erro, preferência
 * do Felipe. Nada de resumo de conversa.
 */

export type MemoryKind = "fato" | "licao" | "preferencia";
export type MemoryEntry = { kind: MemoryKind; text: string; at: string; auto: boolean };

const KINDS: MemoryKind[] = ["fato", "licao", "preferencia"];
const MAX_TEXT = 400;
const MAX_LINES = 80;

export function memoryDir(): string {
  return process.env.CENTRAL_MEMORY_DIR || path.join(cfg().repoDir, "memoria");
}

export function agentSlug(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agente"
  );
}

export function memoryFile(agent: string): string {
  return path.join(memoryDir(), `${agentSlug(agent)}.md`);
}

const HEADER = (agent: string) =>
  `# Memória — ${agent}\n\n_Durável e curta. Escreve o próprio agente (ferramenta \`lembrar\`) ou a revisão automática ao fim de uma execução. O curador semanal junta repetidas e promove lição repetida a habilidade. Não guarde segredo, dado pessoal de lead nem resumo de conversa._\n`;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lê as entradas do arquivo. Linha válida: `- (licao) texto — 15/11`. */
export function listMemory(agent: string): MemoryEntry[] {
  let texto: string;
  try {
    texto = fs.readFileSync(memoryFile(agent), "utf8");
  } catch {
    return [];
  }
  const out: MemoryEntry[] = [];
  for (const linha of texto.split(/\r?\n/)) {
    const m = /^-\s*\((fato|licao|preferencia)\)\s*(.+?)(?:\s+—\s+(\d{2}\/\d{2}))?\s*$/.exec(linha.trim());
    if (!m) continue;
    out.push({ kind: m[1] as MemoryKind, text: m[2].trim(), at: m[3] ?? "", auto: false });
  }
  return out;
}

/** Texto que entra no prompt do agente, com teto de caracteres (as mais recentes valem). */
export function readMemory(agent: string, maxChars = 1600): string {
  let texto: string;
  try {
    texto = fs.readFileSync(memoryFile(agent), "utf8");
  } catch {
    return "";
  }
  const linhas = texto.split(/\r?\n/).filter((l) => l.startsWith("- "));
  if (!linhas.length) return "";
  let escolhidas: string[] = [];
  let total = 0;
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (total + linhas[i].length + 1 > maxChars) break;
    escolhidas.unshift(linhas[i]);
    total += linhas[i].length + 1;
  }
  return escolhidas.join("\n");
}

/** Grava uma entrada. Devolve o motivo quando não entra (repetida, curta, vazia). */
export function remember(agent: string, kind: MemoryKind, texto: string, opts: { auto?: boolean } = {}): { added: boolean; reason?: string } {
  const limpo = String(texto ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  if (limpo.length < 8) return { added: false, reason: "curta demais" };
  if (!KINDS.includes(kind)) return { added: false, reason: "tipo inválido" };
  if (/(sk-ant-|sk-[a-z0-9]{20,}|senha|password|api[_-]?key)/i.test(limpo)) return { added: false, reason: "parece segredo" };
  const existentes = listMemory(agent);
  const n = norm(limpo);
  if (existentes.some((e) => norm(e.text) === n)) return { added: false, reason: "já está na memória" };

  fs.mkdirSync(memoryDir(), { recursive: true });
  const file = memoryFile(agent);
  if (!fs.existsSync(file)) fs.writeFileSync(file, HEADER(agent), { mode: 0o644 });
  const hoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date());
  fs.appendFileSync(file, `- (${kind}) ${limpo} — ${hoje}\n`);

  // Teto: mantém as últimas MAX_LINES entradas e o cabeçalho.
  const todas = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const linhas = todas.filter((l) => l.startsWith("- "));
  if (linhas.length > MAX_LINES) {
    const manter = linhas.slice(-MAX_LINES);
    const cabecalho = todas.filter((l) => !l.startsWith("- ")).join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    fs.writeFileSync(file, `${cabecalho}\n${manter.join("\n")}\n`);
  }
  return { added: true };
}

/** Remove entradas que contenham o trecho (sem diferenciar maiúsculas). */
export function forget(agent: string, trecho: string): number {
  const alvo = norm(trecho);
  if (!alvo) return 0;
  let texto: string;
  try {
    texto = fs.readFileSync(memoryFile(agent), "utf8");
  } catch {
    return 0;
  }
  const linhas = texto.split(/\r?\n/);
  const restantes = linhas.filter((l) => !(l.startsWith("- ") && norm(l).includes(alvo)));
  const removidas = linhas.length - restantes.length;
  if (removidas) fs.writeFileSync(memoryFile(agent), restantes.join("\n").replace(/\n{3,}/g, "\n\n"));
  return removidas;
}
