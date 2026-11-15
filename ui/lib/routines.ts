import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { createConversation, updateConversation } from "./chat";
import { cfg, nowIso } from "./config";
import { getDb } from "./db";
import { commitPaths, type CommitResult } from "./git";
import { getAgent, repoDir } from "./repo";
import { startRun, stopRun } from "./runner";
import { nextRuns, parseQuando } from "./schedule";
import { AUTO_AGENT, TRIAGE_MODEL } from "./triage";
import { centralLink, notifyFelipe } from "./whatsapp";

/*
 * Uma rotina = routines/<nome>.yaml. "Rotina é rotina" (decisoes.md): roda sozinha e
 * reporta depois. Sai como uma conversa da Central ("Rotina · título"), com aviso de
 * 1 a 3 linhas no WhatsApp quando ligado. Com "silêncio", se a resposta for só NADA,
 * não avisa. Agenda em America/Sao_Paulo.
 */

export type Routine = {
  nome: string;
  titulo: string;
  quando: string;
  cron: string;
  agente: string;
  modo: "vps" | "local" | "ambos";
  ativa: boolean;
  silencio: boolean;
  whatsapp: boolean;
  limite_minutos: number;
  /** Ferramentas que esta rotina usa sem pedir aprovação (autorização por escrito, no arquivo). */
  liberadas: string[];
  instrucoes: string;
  file: string;
};

const LIBERAVEIS = /^(Bash|Edit|Write|NotebookEdit|mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+)$/;

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,49}$/;

export function routinesDir(): string {
  return path.join(repoDir(), "routines");
}

export function normalizeRoutine(raw: unknown, file = ""): Routine {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const nome = String(r.nome ?? "").trim();
  if (!NAME_RE.test(nome)) throw new Error("nome: minúsculas, números e hífen (2 a 50)");
  const quando = String(r.quando ?? "").trim();
  const parsed = parseQuando(quando || String(r.cron ?? ""));
  const agente = String(r.agente ?? AUTO_AGENT).trim() || AUTO_AGENT;
  if (agente !== AUTO_AGENT && !getAgent(agente)) throw new Error(`agente "${agente}" não existe em agents/`);
  const modo = String(r.modo ?? "vps") as Routine["modo"];
  if (!["vps", "local", "ambos"].includes(modo)) throw new Error("modo: vps, local ou ambos");
  const instrucoes = String(r.instrucoes ?? "").trim();
  if (instrucoes.length < 10) throw new Error("instruções: escreva o que a rotina faz (autocontido)");
  const limite = Number(r.limite_minutos ?? 30);
  return {
    nome,
    titulo: String(r.titulo ?? nome).trim().slice(0, 100) || nome,
    quando: quando || parsed.texto,
    cron: parsed.cron,
    agente,
    modo,
    ativa: r.ativa !== false,
    silencio: r.silencio !== false,
    whatsapp: r.whatsapp === true,
    limite_minutos: Number.isFinite(limite) ? Math.min(240, Math.max(2, Math.round(limite))) : 30,
    liberadas: (Array.isArray(r.liberadas) ? r.liberadas : typeof r.liberadas === "string" ? r.liberadas.split(/[,\s]+/) : []).map(String).filter((t) => LIBERAVEIS.test(t)),
    instrucoes: instrucoes.slice(0, 12_000),
    file: file || `routines/${nome}.yaml`
  };
}

export function listRoutines(): { routines: Routine[]; errors: { file: string; error: string }[] } {
  const dir = routinesDir();
  const routines: Routine[] = [];
  const errors: { file: string; error: string }[] = [];
  if (!fs.existsSync(dir)) return { routines, errors };
  for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x)).sort()) {
    const rel = `routines/${f}`;
    try {
      routines.push(normalizeRoutine(YAML.parse(fs.readFileSync(path.join(dir, f), "utf8")), rel));
    } catch (e) {
      errors.push({ file: rel, error: e instanceof Error ? e.message : "arquivo inválido" });
    }
  }
  return { routines, errors };
}

export function getRoutine(nome: string): Routine | undefined {
  return listRoutines().routines.find((r) => r.nome === nome);
}

export function routineYaml(r: Routine): string {
  const { file: _file, ...data } = r;
  void _file;
  return `# Rotina da Central. Agenda em America/Sao_Paulo. Rotina roda sozinha e reporta depois.\n${YAML.stringify(data, { lineWidth: 100 })}`;
}

export async function saveRoutine(r: Routine, who: string): Promise<CommitResult> {
  fs.mkdirSync(routinesDir(), { recursive: true });
  fs.writeFileSync(path.join(repoDir(), r.file), routineYaml(r));
  return commitPaths([r.file], `central: rotina ${r.nome} salva (${who})`);
}

export async function deleteRoutine(nome: string, who: string): Promise<CommitResult> {
  const r = getRoutine(nome);
  if (!r) throw new Error("Rotina não encontrada.");
  fs.rmSync(path.join(repoDir(), r.file), { force: true });
  return commitPaths([r.file], `central: rotina ${nome} removida (${who})`);
}

/** Roda na instância certa? (rotina "só VPS" não roda no local, e vice-versa) */
export function runsHere(r: Routine): boolean {
  return r.modo === "ambos" || r.modo === cfg().mode;
}

export function upcoming(r: Routine, n = 5): Date[] {
  try {
    return nextRuns(r.cron, n);
  } catch {
    return [];
  }
}

export type RoutineRun = { id: string; rotina: string; origem: string; conversation_id: string | null; status: string; resumo: string | null; erro: string | null; avisado: number; started_at: string; ended_at: string | null };

export async function routineHistory(nome?: string, limit = 20): Promise<RoutineRun[]> {
  const db = await getDb();
  return nome
    ? db.all<RoutineRun>("SELECT * FROM routine_runs WHERE rotina = ? ORDER BY started_at DESC LIMIT ?", [nome, limit])
    : db.all<RoutineRun>("SELECT * FROM routine_runs ORDER BY started_at DESC LIMIT ?", [limit]);
}

function briefOf(text: string): string {
  const lines = text
    .replace(/[#*_`>]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(0, 3).join("\n").slice(0, 400);
}

/** Dispara uma rotina agora (agenda ou botão "Rodar agora"). */
export async function runRoutine(r: Routine, origem: "agenda" | "manual", who = "agenda"): Promise<{ runId: string; conversationId: string }> {
  const agent = r.agente === AUTO_AGENT ? undefined : getAgent(r.agente);
  const conversation = await createConversation({
    mode: "chat",
    agent: agent ? agent.name : AUTO_AGENT,
    model: agent ? agent.model : TRIAGE_MODEL,
    title: `Rotina · ${r.titulo}`
  });
  if (r.liberadas.length) await updateConversation(conversation.id, { allowed_tools: r.liberadas });
  conversation.allowed_tools = r.liberadas;
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.run("INSERT INTO routine_runs (id, rotina, origem, conversation_id, status, started_at) VALUES (?, ?, ?, ?, 'rodando', ?)", [id, r.nome, origem, conversation.id, nowIso()]);

  const text = `[Rotina agendada da Central: "${r.titulo}" (${r.quando}). Ninguém está acompanhando agora: execute sozinho, sem perguntar. Ação que for decisão do Felipe (campanha nova, gasto, oferta/preço, apagar dado, merge que ninguém pediu) não faça: liste no fim como "Precisa do Felipe".${
    r.silencio ? ' Se não houver nada relevante para reportar, responda exatamente "NADA".' : ""
  } Termine com um resumo de 1 a 3 linhas.]\n\n${r.instrucoes}`;

  const timer = setTimeout(() => void stopRun(conversation.id), r.limite_minutos * 60_000);
  timer.unref?.();
  const started = await startRun({
    conversation,
    text,
    origin: "rotina",
    onEnd: async (end) => {
      clearTimeout(timer);
      const nada = r.silencio && /^\s*NADA\.?\s*$/i.test(end.text);
      const resumo = end.error ? "" : nada ? "nada a reportar" : briefOf(end.text);
      let avisado = 0;
      if (r.whatsapp && !nada) {
        const msg = end.error ? `Rotina "${r.titulo}" falhou: ${end.error.slice(0, 200)}` : `${r.titulo}:\n${resumo || "terminou."}`;
        const sent = await notifyFelipe(`${msg}\n${centralLink(`/chat/${end.conversationId}`)}`, who).catch(() => ({ sent: false, detail: "" }));
        avisado = sent.sent ? 1 : 0;
      }
      await db.run("UPDATE routine_runs SET status = ?, run_id = ?, resumo = ?, erro = ?, avisado = ?, ended_at = ? WHERE id = ?", [
        end.status === "done" ? (nada ? "silencio" : "ok") : end.status,
        end.runId,
        resumo || null,
        end.error || null,
        avisado,
        nowIso(),
        id
      ]);
      if (nada) await updateConversation(end.conversationId, { title: `Rotina · ${r.titulo} (nada a reportar)` });
    }
  }).catch(async (e) => {
    clearTimeout(timer);
    await db.run("UPDATE routine_runs SET status = 'error', erro = ?, ended_at = ? WHERE id = ?", [e instanceof Error ? e.message : String(e), nowIso(), id]);
    throw e;
  });
  return { runId: started.runId, conversationId: conversation.id };
}
