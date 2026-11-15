import { query } from "@anthropic-ai/claude-agent-sdk";
import { cfg } from "./config";
import { agentEnv } from "./guardrails";
import { claudeChain, claudeEnvFor, markLimited, saveUsage } from "./providers";

/*
 * Rotina "ping" (resets da janela de 5h): só abre a janela de cada conta Claude.
 * Uma chamada mínima por conta: Haiku, sem ferramentas, sem contexto, uma volta.
 * Antes isso passava pela triagem e pelo orquestrador inteiro (dezenas de milhares de tokens).
 */
export async function pingAccounts(): Promise<{ ok: string[]; falhas: string[] }> {
  const c = cfg();
  const ok: string[] = [];
  const falhas: string[] = [];
  for (const conta of await claudeChain(null)) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 60_000);
    let fail = "";
    try {
      for await (const msg of query({
        prompt: "ok",
        options: {
          cwd: c.dataDir,
          model: "claude-haiku-5-5",
          abortController: abort,
          settingSources: [],
          strictMcpConfig: true,
          mcpServers: {},
          systemPrompt: 'Responda só "ok".',
          tools: [],
          maxTurns: 1,
          env: { ...agentEnv(), ...(await claudeEnvFor(conta)) },
          ...(c.claudePath ? { pathToClaudeCodeExecutable: c.claudePath } : {})
        }
      })) {
        const m = msg as unknown as Record<string, unknown> & { type: string };
        if (m.type === "rate_limit_event") {
          const info = (m.rate_limit_info ?? {}) as { status?: string; resetsAt?: number; rateLimitType?: string; utilization?: number };
          void saveUsage(conta.id, info).catch(() => undefined);
          if (info.status === "rejected") {
            fail = "no limite";
            await markLimited(conta.id, info.resetsAt).catch(() => undefined);
          }
        } else if (m.type === "result" && (m.subtype !== "success" || m.is_error === true)) {
          fail = fail || String(m.subtype);
        }
      }
    } catch (e) {
      fail = fail || (e instanceof Error ? e.message.split("\n")[0] : String(e));
    } finally {
      clearTimeout(timer);
    }
    (fail ? falhas : ok).push(fail ? `${conta.name}: ${fail}` : conta.name);
  }
  return { ok, falhas };
}
