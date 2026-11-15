import { spawn } from "node:child_process";
import { baseEnv, codexJs } from "./providers";

/*
 * ChatGPT pelo Codex CLI oficial (`codex exec --json`), sempre com o sandbox
 * "read-only": não escreve, não instala, não roda nada que altere a máquina.
 * Onde o sandbox do Codex não sobe (contêiner sem permissão de montagem, como a VPS),
 * os comandos dele falham e ele só conversa; nunca rodamos sem sandbox.
 */

export type CodexEvents = { onText: (t: string) => void; onTool: (id: string, name: string, summary: string) => void };
export type CodexResult = { text: string; error: string; inputTokens?: number; outputTokens?: number };

type Item = { id?: string; type?: string; text?: string; command?: string; query?: string; server?: string; tool?: string; changes?: unknown[] };

export function runCodex(opts: { prompt: string; home: string; cwd: string; model?: string; abort: AbortController }, ev: CodexEvents): Promise<CodexResult> {
  const js = codexJs();
  if (!js) return Promise.resolve({ text: "", error: "Codex CLI não instalado nesta máquina." });
  const args = [js, "exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "-C", opts.cwd, ...(opts.model ? ["-m", opts.model] : []), "-"];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { env: { ...baseEnv(), CODEX_HOME: opts.home } as unknown as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    let text = "";
    let error = "";
    let lastTransient = "";
    let usage: { input_tokens?: number; output_tokens?: number } = {};
    const onAbort = () => child.kill();
    opts.abort.signal.addEventListener("abort", onAbort, { once: true });

    const handle = (line: string) => {
      let e: { type?: string; item?: Item; message?: string; error?: { message?: string }; usage?: typeof usage };
      try {
        e = JSON.parse(line);
      } catch {
        return;
      }
      const item = e.item ?? {};
      if (e.type === "item.completed" && item.type === "agent_message" && item.text) {
        const piece = (text ? "\n\n" : "") + item.text;
        text += piece;
        ev.onText(piece);
      } else if (e.type === "item.started" || (e.type === "item.completed" && item.type !== "agent_message" && item.type !== "reasoning")) {
        const name = item.type === "command_execution" ? "Terminal (Codex)" : item.type === "web_search" ? "Busca na web" : item.type === "mcp_tool_call" ? `${item.server} · ${item.tool}` : item.type === "file_change" ? "Arquivo (Codex)" : "";
        const summary = item.command ?? item.query ?? "";
        if (name && item.id && e.type === "item.started") ev.onTool(item.id, name, String(summary).slice(0, 300));
      } else if (e.type === "turn.completed") {
        usage = e.usage ?? {};
      } else if (e.type === "turn.failed") {
        error = e.error?.message ?? "O Codex falhou.";
      } else if (e.type === "error") {
        // "Reconnecting… n/5" é passageiro; guarda para mostrar se nada der certo.
        lastTransient = e.message ?? "";
        if (!/^Reconnecting/i.test(lastTransient)) error = lastTransient;
      }
    };

    child.stdout.on("data", (d: Buffer) => {
      buf += d.toString("utf8");
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.startsWith("{")) handle(line);
      }
    });
    child.stderr.on("data", () => undefined);
    child.on("error", (e) => (error = `Não consegui abrir o Codex: ${e.message}`));
    child.on("close", (code) => {
      opts.abort.signal.removeEventListener("abort", onAbort);
      if (buf.trim().startsWith("{")) handle(buf.trim());
      if (!text && !error && code !== 0 && !opts.abort.signal.aborted) error = lastTransient || `O Codex saiu com código ${code}.`;
      resolve({ text, error, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens });
    });
    child.stdin.end(opts.prompt);
  });
}

/** Erro do Codex em português, sem detalhe técnico desnecessário. */
export function friendlyCodexError(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("401") || t.includes("unauthorized") || t.includes("not logged in")) return "O ChatGPT não está conectado. Abra Provedores e entre na conta.";
  if (t.includes("usage limit") || t.includes("rate limit") || t.includes("429")) return "Limite de uso do ChatGPT atingido. Tente mais tarde ou use uma conta Claude.";
  return raw.replace(/\s+/g, " ").slice(0, 300);
}
