import fs from "node:fs";
import path from "node:path";
import { commitPaths, type CommitResult } from "./git";
import { repoDir } from "./repo";

/*
 * Anotações que a Central grava nos arquivos do repositório, nas palavras do Felipe:
 *  - feedback.md   → "## Registros", no formato do próprio arquivo;
 *  - decisoes.md   → seção do dia no topo (a mais recente vale);
 *  - milestones.md → "## Entrada" (ideias), até o Trello certo estar ligado.
 * Cada gravação faz commit só do arquivo tocado.
 */

export type NoteKind = "feedback" | "decisao" | "ideia";
export type Sentimento = "bom" | "ruim" | "ideia";

const FILES: Record<NoteKind, string> = { feedback: "feedback.md", decisao: "decisoes.md", ideia: "milestones.md" };

function hoje(): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

/** Uma linha só, sem quebrar a tabela nem o Markdown. */
function clean(text: string, max = 600): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "/").replace(/"/g, "'").trim().slice(0, max);
}

function readOr(file: string, fallback: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

export function feedbackLine(sentimento: Sentimento, onde: string, texto: string, data = hoje()): string {
  return `- ${data} · ${clean(onde, 160)} · ${sentimento} · "${clean(texto) || "(sem comentário)"}"\n  → (a encaminhar na triagem semanal)`;
}

export function insertFeedback(doc: string, line: string): string {
  const marker = "## Registros";
  if (!doc.includes(marker)) return `${doc.trimEnd()}\n\n${marker}\n\n${line}\n`;
  const [head, rest] = [doc.slice(0, doc.indexOf(marker) + marker.length), doc.slice(doc.indexOf(marker) + marker.length)];
  const body = rest.replace(/^\s*_\(vazio\)_\s*/m, "").trim();
  return `${head}\n\n${body ? `${body}\n` : ""}${line}\n`;
}

export function insertDecision(doc: string, texto: string, data = hoje()): string {
  const title = `## ${data} — anotado pela Central`;
  const row = `| ${clean(texto)} | a aplicar (dita pelo Felipe; a triagem corrige os arquivos antigos) |`;
  if (doc.includes(title)) {
    const at = doc.indexOf(title);
    const next = doc.indexOf("\n## ", at + title.length);
    const end = next === -1 ? doc.length : next;
    const section = doc.slice(at, end).trimEnd();
    return `${doc.slice(0, at)}${section}\n${row}\n${doc.slice(end)}`;
  }
  const block = `${title}\n\n| decisão | o que muda |\n|---|---|\n${row}\n\n`;
  const first = doc.indexOf("\n## ");
  if (first === -1) return `${doc.trimEnd()}\n\n${block}`;
  return `${doc.slice(0, first + 1)}${block}${doc.slice(first + 1)}`;
}

export function insertIdea(doc: string, texto: string, data = hoje()): string {
  const marker = "## Entrada (ideias)";
  const line = `- ${data} · "${clean(texto)}" (via Central; encaixar no milestone certo)`;
  if (!doc.includes(marker)) {
    return `${doc.trimEnd()}\n\n${marker}\n\n_Ideias que chegam pela Central ou pelo WhatsApp. Até o Trello certo estar ligado, ficam aqui; a triagem semanal encaixa cada uma._\n\n${line}\n`;
  }
  return `${doc.trimEnd()}\n${line}\n`;
}

type Note = { kind: NoteKind; texto: string; sentimento?: Sentimento; onde?: string };

/** Grava várias anotações e faz um commit só. Devolve onde cada uma foi parar. */
export async function writeNotes(notes: Note[], quem = "Felipe"): Promise<{ written: { tipo: NoteKind; texto: string; onde: string }[]; commit: CommitResult | null }> {
  const root = repoDir();
  const touched = new Set<string>();
  const written: { tipo: NoteKind; texto: string; onde: string }[] = [];
  for (const n of notes) {
    const texto = n.texto.trim();
    if (!texto) continue;
    const rel = FILES[n.kind];
    const file = path.join(root, rel);
    const doc = readOr(file, `# ${rel.replace(".md", "")}\n`);
    let next = doc;
    if (n.kind === "feedback") next = insertFeedback(doc, feedbackLine(n.sentimento ?? "ideia", n.onde ?? "Central", texto));
    else if (n.kind === "decisao") next = insertDecision(doc, texto);
    else next = insertIdea(doc, texto);
    fs.writeFileSync(file, next);
    touched.add(rel);
    written.push({ tipo: n.kind, texto, onde: rel });
  }
  if (!touched.size) return { written, commit: null };
  const kinds = [...new Set(written.map((w) => w.tipo))].join(", ");
  const commit = await commitPaths([...touched], `central: ${kinds} anotado (${quem})`);
  return { written, commit };
}
