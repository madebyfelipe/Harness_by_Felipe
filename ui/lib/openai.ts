import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { pathBlocked } from "./guardrails";

/*
 * Motor para provedores de API compatíveis com OpenAI (DeepSeek hoje, qualquer outro
 * com o mesmo formato amanhã). O Codex CLI não serve: a versão instalada só fala a API
 * "responses", que a DeepSeek não tem.
 *
 * Diferença em relação ao caminho Claude: aqui o laço de ferramentas é da própria Central,
 * então toda escrita e todo comando passam pelo mesmo portão de aprovação (a função
 * `approve`, que usa a tabela de aprovações e o modo automático).
 */

export type OaTool = { id: string; name: string; summary: string };
export type OaEvents = { onText: (t: string) => void; onTool: (t: OaTool) => void };
export type OaResult = { text: string; error: string; inputTokens: number; outputTokens: number; steps: number };
export type Approve = (tool: string, input: Record<string, unknown>) => Promise<"allow" | "deny">;

const MAX_STEPS = 24;
const MAX_READ = 200_000;
const MAX_OUT = 20_000;
const BASH_TIMEOUT = 120_000;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "ler_arquivo",
      description: "Lê um arquivo de texto. Caminho relativo à pasta de trabalho.",
      parameters: { type: "object", properties: { caminho: { type: "string" } }, required: ["caminho"] }
    }
  },
  {
    type: "function",
    function: {
      name: "listar",
      description: "Lista arquivos e pastas. Sem caminho, lista a pasta de trabalho.",
      parameters: { type: "object", properties: { caminho: { type: "string" }, padrao: { type: "string", description: "ex.: **/*.ts" } } }
    }
  },
  {
    type: "function",
    function: {
      name: "procurar",
      description: "Procura um texto ou expressão regular nos arquivos e devolve as linhas que casam.",
      parameters: { type: "object", properties: { padrao: { type: "string" }, caminho: { type: "string" } }, required: ["padrao"] }
    }
  },
  {
    type: "function",
    function: {
      name: "escrever_arquivo",
      description: "Cria ou sobrescreve um arquivo com o conteúdo dado. Exige aprovação do Felipe.",
      parameters: { type: "object", properties: { caminho: { type: "string" }, conteudo: { type: "string" } }, required: ["caminho", "conteudo"] }
    }
  },
  {
    type: "function",
    function: {
      name: "rodar_comando",
      description: "Roda um comando de terminal na pasta de trabalho. Exige aprovação do Felipe.",
      parameters: { type: "object", properties: { comando: { type: "string" } }, required: ["comando"] }
    }
  }
] as const;

function globToRe(glob: string): RegExp {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\?/g, ".").split("\u0000").join(".*");
  return new RegExp(`^${esc}$`);
}

function walk(root: string, limit = 4000): string[] {
  const out: string[] = [];
  const skip = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo"]);
  const go = (dir: string, depth: number) => {
    if (out.length >= limit || depth > 8) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) go(p, depth + 1);
      else if (e.isFile()) out.push(p);
    }
  };
  go(root, 0);
  return out;
}

function runBash(comando: string, cwd: string, signal: AbortSignal): Promise<{ out: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("/bin/bash", ["-lc", comando], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: process.env.LANG ?? "C.UTF-8" } as unknown as NodeJS.ProcessEnv
    }) as ChildProcess;
    let out = "";
    let done = false;
    const finish = (code: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve({ out: out.slice(0, MAX_OUT), code });
    };
    const onAbort = () => {
      child.kill("SIGKILL");
      finish(130);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      out += `\n[tempo esgotado em ${BASH_TIMEOUT / 1000}s]`;
      finish(124);
    }, BASH_TIMEOUT);
    signal.addEventListener("abort", onAbort, { once: true });
    child.stdout?.on("data", (d: Buffer) => (out += d.toString("utf8")));
    child.stderr?.on("data", (d: Buffer) => (out += d.toString("utf8")));
    child.on("error", (e: Error) => {
      out += `erro ao abrir o terminal: ${e.message}`;
      finish(127);
    });
    child.on("close", (code) => finish(code ?? 0));
  });
}

/** Executa a ferramenta pedida pelo modelo. Devolve o texto que volta para ele. */
async function execTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { cwd: string; dataDir: string; allowDirs: string[]; signal: AbortSignal; approve: Approve },
  onTool: (t: OaTool) => void
): Promise<string> {
  const blocked = pathBlocked(String(args.caminho ?? ""), ctx.cwd, ctx.dataDir, ctx.allowDirs);
  if (blocked) return `Bloqueado pela Central: ${blocked}.`;
  const abs = (p: string) => path.resolve(ctx.cwd, p.replace(/^~/, process.env.HOME ?? "~"));
  const id = crypto.randomUUID();
  try {
    if (name === "ler_arquivo") {
      const f = abs(String(args.caminho ?? ""));
      onTool({ id, name: "Ler arquivo", summary: path.relative(ctx.cwd, f).slice(0, 200) });
      if (!fs.existsSync(f)) return `Arquivo não existe: ${args.caminho}`;
      const buf = fs.readFileSync(f);
      return buf.subarray(0, MAX_READ).toString("utf8") + (buf.length > MAX_READ ? "\n[arquivo cortado em 200 KB]" : "");
    }
    if (name === "listar") {
      const dir = abs(String(args.caminho ?? "."));
      const padrao = typeof args.padrao === "string" && args.padrao.trim() ? args.padrao.trim() : "";
      onTool({ id, name: "Listar", summary: `${path.relative(ctx.cwd, dir) || "."}${padrao ? ` · ${padrao}` : ""}` });
      if (!fs.existsSync(dir)) return `Pasta não existe: ${args.caminho ?? "."}`;
      if (fs.statSync(dir).isFile()) return path.basename(dir);
      const files = walk(dir).map((f) => path.relative(dir, f));
      const re = padrao ? globToRe(padrao.replace(/^\.\//, "")) : null;
      const list = (re ? files.filter((f) => re.test(f)) : files).slice(0, 400);
      return list.length ? list.join("\n") : "nada encontrado";
    }
    if (name === "procurar") {
      const dir = abs(String(args.caminho ?? "."));
      const padrao = String(args.padrao ?? "");
      onTool({ id, name: "Procurar", summary: `${padrao.slice(0, 60)}${args.caminho ? ` em ${args.caminho}` : ""}` });
      let re: RegExp;
      try {
        re = new RegExp(padrao, "i");
      } catch {
        return "Expressão inválida.";
      }
      const hits: string[] = [];
      for (const f of walk(fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? dir : ctx.cwd)) {
        if (hits.length >= 120) break;
        let text = "";
        try {
          const st = fs.statSync(f);
          if (st.size > 1_000_000) continue;
          text = fs.readFileSync(f, "utf8");
        } catch {
          continue;
        }
        text.split("\n").forEach((line, i) => {
          if (hits.length < 120 && re.test(line)) hits.push(`${path.relative(ctx.cwd, f)}:${i + 1}: ${line.trim().slice(0, 240)}`);
        });
      }
      return hits.length ? hits.join("\n") : "nada encontrado";
    }
    if (name === "escrever_arquivo") {
      const f = abs(String(args.caminho ?? ""));
      const conteudo = String(args.conteudo ?? "");
      const decisao = await ctx.approve("Write", { file_path: f, content: conteudo });
      if (decisao === "deny") return "O Felipe negou esta escrita. Não tente outro caminho para gravar o mesmo conteúdo.";
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, conteudo);
      return `gravado: ${path.relative(ctx.cwd, f)} (${conteudo.length} caracteres)`;
    }
    if (name === "rodar_comando") {
      const comando = String(args.comando ?? "");
      if (!comando.trim()) return "comando vazio";
      const decisao = await ctx.approve("Bash", { command: comando });
      if (decisao === "deny") return "O Felipe negou este comando. Não tente outro caminho para fazer a mesma coisa.";
      const r = await runBash(comando, ctx.cwd, ctx.signal);
      onTool({ id, name: "Terminal", summary: comando.slice(0, 200) });
      return `saída (código ${r.code}):\n${r.out || "(sem saída)"}`;
    }
    return `Ferramenta desconhecida: ${name}`;
  } catch (e) {
    return `Erro na ferramenta ${name}: ${e instanceof Error ? e.message : "erro"}`;
  }
}

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[]; tool_call_id?: string };

export function friendlyOpenAiError(status: number, body: string): string {
  const t = body.toLowerCase();
  if (status === 401 || t.includes("invalid api key") || t.includes("authentication")) return "A chave da DeepSeek foi recusada. Confira em Configurações → Provedores de IA.";
  if (status === 402 || t.includes("insufficient balance")) return "A conta da DeepSeek está sem saldo. Recarregue em platform.deepseek.com.";
  if (status === 429) return "A DeepSeek está limitando os pedidos agora. Espere um pouco e mande de novo.";
  if (status === 400 && t.includes("model")) return "Este modelo não existe na conta da DeepSeek (use deepseek-chat ou deepseek-reasoner).";
  if (status >= 500) return "A DeepSeek está com problema agora. Tente de novo em instantes.";
  return `A DeepSeek recusou o pedido (HTTP ${status}): ${body.replace(/\s+/g, " ").slice(0, 200)}`;
}

/** Laço de conversa com ferramentas, contra uma API compatível com OpenAI (streaming). */
export async function runOpenAi(
  opts: { system: string; prompt: string; model: string; baseUrl: string; apiKey: string; cwd: string; dataDir: string; allowDirs?: string[]; signal: AbortSignal; approve: Approve },
  ev: OaEvents
): Promise<OaResult> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const messages: Msg[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.prompt }
  ];
  let text = "";
  let error = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let steps = 0;
  const ctx = { cwd: opts.cwd, dataDir: opts.dataDir, allowDirs: opts.allowDirs ?? [], signal: opts.signal, approve: opts.approve };

  while (steps < MAX_STEPS) {
    if (opts.signal.aborted) {
      error = error || "";
      break;
    }
    steps += 1;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        signal: opts.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({ model: opts.model, messages, tools: TOOLS, tool_choice: "auto", stream: true, stream_options: { include_usage: true } })
      });
    } catch (e) {
      if (opts.signal.aborted) break;
      error = /network|fetch failed/i.test(String(e)) ? "Não consegui falar com a DeepSeek (rede ou DNS)." : `Falha ao chamar a DeepSeek: ${e instanceof Error ? e.message : "erro"}`;
      break;
    }
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      error = friendlyOpenAiError(res.status, body);
      break;
    }

    let content = "";
    const calls: { id: string; type: "function"; function: { name: string; arguments: string } }[] = [];
    const decoder = new TextDecoder();
    let buf = "";
    const handle = (line: string) => {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      let chunk: {
        choices?: { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      try {
        chunk = JSON.parse(payload);
      } catch {
        return;
      }
      if (chunk.usage) {
        inputTokens += chunk.usage.prompt_tokens ?? 0;
        outputTokens += chunk.usage.completion_tokens ?? 0;
      }
      const d = chunk.choices?.[0]?.delta;
      if (d?.content) {
        content += d.content;
        text += d.content;
        ev.onText(d.content);
      }
      for (const c of d?.tool_calls ?? []) {
        const slot = (calls[c.index] ??= { id: c.id ?? crypto.randomUUID(), type: "function", function: { name: "", arguments: "" } });
        if (c.id) slot.id = c.id;
        if (c.function?.name) slot.function.name += c.function.name;
        if (c.function?.arguments) slot.function.arguments += c.function.arguments;
      }
    };
    for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(part, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        handle(line);
      }
    }
    if (buf.trim()) handle(buf.trim());

    if (!calls.length) break; // resposta final
    messages.push({ role: "assistant", content: content || null, tool_calls: calls });
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(c.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      const saida = await execTool(c.function.name, args, ctx, ev.onTool);
      messages.push({ role: "tool", tool_call_id: c.id, content: saida });
      if (opts.signal.aborted) break;
    }
    if (opts.signal.aborted) break;
  }

  if (steps >= MAX_STEPS && !error) error = `Parei em ${MAX_STEPS} passos para não ficar em laço.`;
  return { text: text.trim(), error, inputTokens, outputTokens, steps };
}
