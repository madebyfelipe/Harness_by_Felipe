import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { cfg } from "./config";
import { getDb } from "./db";
import { agentEnv } from "./guardrails";
import { claudeChain, claudeEnvFor } from "./providers";

/*
 * Sugestões da tela inicial: 6 pedidos curtos tirados das últimas conversas.
 * Leve de propósito: uma chamada de Haiku sem ferramentas nem contexto do repositório,
 * guardada em cache e refeita só quando há conversa nova (no máximo a cada 3 h) ou após 24 h.
 */

export type Suggestion = { icon: string; label: string; text: string };
type Cache = { at: number; key: string; items: Suggestion[] };

const ICONS = ["spark", "users", "chat", "plus", "calendar", "whatsapp", "bolt", "code", "search", "doc", "image", "check"];
const MIN_AGE = 3 * 3600_000;
const MAX_AGE = 24 * 3600_000;

const g = globalThis as unknown as { __centralSug?: Promise<Suggestion[]> | null };
const file = () => path.join(cfg().dataDir, "sugestoes.json");

function readCache(): Cache | null {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8")) as Cache;
  } catch {
    return null;
  }
}

async function recent(): Promise<{ key: string; lines: string[] }> {
  const db = await getDb();
  const rows = await db.all<{ id: string; title: string; updated_at: string; last: string | null }>(
    `SELECT c.id, c.title, c.updated_at,
       (SELECT m.content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.created_at DESC LIMIT 1) AS last
     FROM conversations c WHERE c.archived = 0 AND c.title NOT LIKE 'Rotina ·%' ORDER BY c.updated_at DESC LIMIT 12`
  );
  return {
    key: rows.map((r) => `${r.id}:${r.updated_at}`).join("|"),
    lines: rows.map((r) => `- ${r.title.slice(0, 80)}${r.last ? ` — último pedido: ${r.last.replace(/\s+/g, " ").slice(0, 160)}` : ""}`)
  };
}

function parse(raw: string): Suggestion[] {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as Partial<Suggestion>[];
    return arr
      .filter((s) => s && typeof s.label === "string" && typeof s.text === "string")
      .slice(0, 6)
      .map((s) => ({ icon: ICONS.includes(String(s.icon)) ? String(s.icon) : "spark", label: s.label!.trim().slice(0, 34), text: s.text!.trim().slice(0, 300) }));
  } catch {
    return [];
  }
}

async function generate(lines: string[]): Promise<Suggestion[]> {
  const conta = (await claudeChain(null))[0];
  if (!conta || !lines.length) return [];
  const c = cfg();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 45_000);
  let raw = "";
  try {
    for await (const msg of query({
      prompt: `Últimas conversas do Felipe com a Central (o assistente da agência Made by Felipe):\n${lines.join("\n")}\n\nSugira 6 pedidos que ele provavelmente quer fazer agora: continuar o que ficou pela metade, o próximo passo lógico, ou conferir um resultado. Responda SÓ um array JSON: [{"icon":"${ICONS.join("|")}","label":"2 a 4 palavras","text":"o pedido completo, em 1ª pessoa, pronto para enviar ou completar"}]. Português do Brasil, sem inventar fatos que não estão acima.`,
      options: {
        cwd: c.dataDir,
        model: "claude-haiku-5-5",
        abortController: abort,
        settingSources: [],
        strictMcpConfig: true,
        mcpServers: {},
        systemPrompt: "Você gera sugestões curtas de pedidos. Responda só JSON.",
        tools: [],
        maxTurns: 1,
        env: { ...agentEnv(), ...(await claudeEnvFor(conta)) },
        ...(c.claudePath ? { pathToClaudeCodeExecutable: c.claudePath } : {})
      }
    })) {
      const m = msg as unknown as { type: string; result?: unknown };
      if (m.type === "result" && typeof m.result === "string") raw = m.result;
    }
  } catch {
    /* sem sugestão nova: fica a anterior */
  } finally {
    clearTimeout(timer);
  }
  return parse(raw);
}

/** Devolve as sugestões do cache na hora; se estiverem velhas, refaz em segundo plano. */
export async function getSuggestions(): Promise<{ items: Suggestion[]; updating: boolean }> {
  const cache = readCache();
  const { key, lines } = await recent();
  const age = cache ? Date.now() - cache.at : Infinity;
  const stale = !cache || age > MAX_AGE || (cache.key !== key && age > MIN_AGE);
  if (stale && lines.length && !g.__centralSug) {
    g.__centralSug = generate(lines)
      .then((items) => {
        if (items.length) fs.writeFileSync(file(), JSON.stringify({ at: Date.now(), key, items } satisfies Cache), { mode: 0o600 });
        return items;
      })
      .finally(() => (g.__centralSug = null));
  }
  return { items: cache?.items ?? [], updating: Boolean(g.__centralSug) };
}
