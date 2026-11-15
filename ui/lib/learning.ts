import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { cfg } from "./config";
import { agentEnv } from "./guardrails";
import { claudeChain, claudeEnvFor } from "./providers";
import { remember, type MemoryKind } from "./agent-memory";

/*
 * Revisão de aprendizado (o "background review" do Hermes, adaptado).
 * Ao fim de uma execução longa ou que falhou, um Haiku lê o pedido, o resultado e as
 * ferramentas usadas e devolve no máximo 3 lições duráveis. Elas vão para a memória do
 * agente, sem cartão de aprovação — é anotação, não ação.
 *
 * Controle de custo: só roda com 6+ ferramentas ou erro, no máximo a cada 20 min por
 * agente, com resposta curta e sem contexto do repositório.
 */

export type ReviewInput = {
  agent: string;
  pedido: string;
  resultado: string;
  ferramentas: string[];
  erro: string;
  voltas: number;
};

const MIN_TOOLS = 6;
const MIN_INTERVAL = 20 * 60_000;

type Estado = Record<string, number>;
const estadoFile = () => path.join(cfg().dataDir, "aprendizado.json");

function lerEstado(): Estado {
  try {
    return JSON.parse(fs.readFileSync(estadoFile(), "utf8")) as Estado;
  } catch {
    return {};
  }
}

function podeRodar(agent: string): boolean {
  const e = lerEstado();
  return !e[agent] || Date.now() - e[agent] > MIN_INTERVAL;
}

function marcar(agent: string): void {
  const e = lerEstado();
  e[agent] = Date.now();
  try {
    fs.mkdirSync(path.dirname(estadoFile()), { recursive: true });
    fs.writeFileSync(estadoFile(), JSON.stringify(e));
  } catch {
    /* sem estado: na pior hipótese roda de novo */
  }
}

function parse(raw: string): { kind: MemoryKind; text: string }[] {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as { tipo?: string; texto?: string }[];
    return arr
      .filter((l) => l && typeof l.texto === "string")
      .slice(0, 3)
      .map((l) => ({ kind: (l.tipo === "fato" || l.tipo === "preferencia" ? l.tipo : "licao") as MemoryKind, text: String(l.texto).slice(0, 400) }));
  } catch {
    return [];
  }
}

/** Roda a revisão e grava as lições. Devolve quantas entraram. */
export async function reviewRun(r: ReviewInput): Promise<number> {
  if (!r.agent || r.agent === "auto" || r.agent === "chatgpt" || r.agent === "deepseek") return 0;
  if (r.ferramentas.length < MIN_TOOLS && !r.erro) return 0;
  if (!r.resultado && !r.erro) return 0;
  if (!podeRodar(r.agent)) return 0;

  const conta = (await claudeChain(null))[0];
  if (!conta) return 0;
  const env = { ...agentEnv(), ...(await claudeEnvFor(conta)) };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 45_000);
  let raw = "";
  try {
    for await (const msg of query({
      prompt: `Agente: ${r.agent}
Pedido do Felipe: ${r.pedido.replace(/\s+/g, " ").slice(0, 800)}
Ferramentas usadas: ${r.ferramentas.slice(0, 20).map((f) => f.slice(0, 120)).join(" | ") || "nenhuma"}
Erro: ${r.erro ? r.erro.replace(/\s+/g, " ").slice(0, 500) : "nenhum"}
Resultado (resumo): ${r.resultado.replace(/\s+/g, " ").slice(0, 1200)}

Extraia no máximo 3 lições DURÁVEIS para a memória deste agente: um fato estável do negócio/ambiente, uma lição de um erro que não deve se repetir, ou uma preferência do Felipe. Nada de resumo da conversa, nada de dado pessoal de lead, nada de segredo, nada de coisa óbvia. Se não houver nada durável, devolva [].
Responda SÓ JSON: [{"tipo":"fato|licao|preferencia","texto":"uma frase curta, imperativa ou factual"}]`,
      options: {
        model: "claude-haiku-5-5",
        abortController: abort,
        settingSources: [],
        strictMcpConfig: true,
        permissionMode: "default",
        tools: [],
        maxTurns: 1,
        env
      }
    })) {
      if (msg.type === "assistant") {
        for (const bloco of msg.message.content) if (bloco.type === "text") raw += bloco.text;
      }
    }
  } catch (e) {
    console.error("[central] revisão de aprendizado falhou:", e instanceof Error ? e.message : e);
    clearTimeout(timer);
    return 0;
  }
  clearTimeout(timer);
  let entraram = 0;
  for (const l of parse(raw)) {
    if (remember(r.agent, l.kind, l.text, { auto: true }).added) entraram++;
  }
  marcar(r.agent);
  return entraram;
}
