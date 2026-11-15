/*
 * Teste do provedor DeepSeek sem chave real: uma API falsa no formato OpenAI em
 * http://127.0.0.1:4697 devolve um pedido de ferramenta e depois o texto final.
 * Cobre: cadastro do provedor, "Conferir" da chave, leitura de arquivo sem aprovação,
 * comando negado por aprovação e o texto final voltando para o chat.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const DATA = "/tmp/central-deepseek/dados";
const REPO = "/tmp/central-deepseek/repo";
const PORT = 4697;
const KEY = "sk-" + "a".repeat(32);

fs.rmSync("/tmp/central-deepseek", { recursive: true, force: true });
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(REPO, { recursive: true });
fs.writeFileSync(path.join(REPO, "a.txt"), "conteudo do arquivo de teste");

process.env.CENTRAL_DATA_DIR = DATA;
process.env.CENTRAL_REPO_DIR = REPO;
process.env.CENTRAL_MODE = "local";
process.env.CENTRAL_PUBLIC_URL = "http://localhost:4600";
process.env.CENTRAL_SCHEDULER = "0";
process.env.CENTRAL_DEEPSEEK_URL = `http://127.0.0.1:${PORT}/v1`;

const problemas: string[] = [];
const check = (ok: boolean, o: string) => {
  console.log(`${ok ? "✓" : "✗"} ${o}`);
  if (!ok) problemas.push(o);
};

/** Roteiro de respostas: cada requisição consome o próximo passo. */
let roteiro: (object | "texto")[] = [];
const pedidos: { ferramentas: number; chamadas: string[] }[] = [];

const frame = (delta: object, finish: string | null = null) =>
  `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "deepseek-chat", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = req.url ?? "";
    res.setHeader("content-type", "application/json");
    if (url.endsWith("/models") || url.endsWith("/chat/completions")) {
      if (String(req.headers.authorization ?? "") !== `Bearer ${KEY}`) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: { message: "Authentication Fails, Your api key is invalid", type: "authentication_error" } }));
      }
    }
    if (url.endsWith("/models")) {
      return res.end(JSON.stringify({ data: [{ id: "deepseek-chat" }, { id: "deepseek-reasoner" }] }));
    }
    if (!url.endsWith("/chat/completions")) {
      res.statusCode = 404;
      return res.end("{}");
    }
    const parsed = JSON.parse(body || "{}") as { messages?: { role: string; content?: string }[]; tools?: unknown[] };
    const chamadas = (parsed.messages ?? []).filter((m) => m.role === "tool").map((m) => String(m.content ?? "").slice(0, 120));
    pedidos.push({ ferramentas: Array.isArray(parsed.tools) ? parsed.tools.length : 0, chamadas });

    const passo = roteiro.shift();
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    if (!passo || passo === "texto") {
      res.write(frame({ role: "assistant", content: "terminei. " }));
      res.write(frame({ content: "resultado: " + (chamadas[chamadas.length - 1] ?? "nada") }));
      res.write(frame({}, "stop"));
    } else {
      res.write(frame({ role: "assistant", tool_calls: [{ index: 0, id: `call_${pedidos.length}`, type: "function", function: passo }] }, "tool_calls"));
    }
    res.write(`data: ${JSON.stringify({ id: "c1", choices: [], usage: { prompt_tokens: 30, completion_tokens: 10 } })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  });
});
await new Promise<void>((r) => fake.listen(PORT, "127.0.0.1", () => r()));

const { createProvider, checkProvider, getProvider, updateProvider } = await import("../lib/providers");
const { runOpenAi } = await import("../lib/openai");

/* cadastro e conferência da chave */
const p = await createProvider({ kind: "deepseek", name: "DeepSeek", apiKey: KEY });
check(p.kind === "deepseek" && p.hasSecret, "provedor DeepSeek criado com a chave guardada");
check(p.info.model === "deepseek-chat", "modelo padrão é deepseek-chat");
const info = await checkProvider(p.id);
check(info.loggedIn === true, `conferir a chave devolve conectada (${info.detail ?? ""})`.slice(0, 120));
await updateProvider(p.id, { model: "deepseek-reasoner" });
check((await getProvider(p.id))!.info.model === "deepseek-reasoner", "dá para trocar o modelo do provedor");

/* leitura de arquivo: não pede aprovação */
const aprovacoes: string[] = [];
roteiro = [{ name: "ler_arquivo", arguments: JSON.stringify({ caminho: "a.txt" }) }, "texto"];
const r1 = await runOpenAi(
  {
    system: "teste",
    prompt: "leia a.txt",
    model: "deepseek-chat",
    baseUrl: `http://127.0.0.1:${PORT}/v1`,
    apiKey: KEY,
    cwd: REPO,
    dataDir: DATA,
    signal: new AbortController().signal,
    approve: async (tool) => {
      aprovacoes.push(tool);
      return "allow";
    }
  },
  { onText: () => undefined, onTool: () => undefined }
);
check(!r1.error, `execução sem erro (${r1.error || "ok"})`);
check(r1.text.includes("conteudo do arquivo de teste"), "o conteúdo do arquivo chegou ao texto final");
check(aprovacoes.length === 0, "ler arquivo não pede aprovação");
check(pedidos.at(-2)?.ferramentas === 5, "as 5 ferramentas foram oferecidas ao modelo");
check((pedidos.at(-1)?.chamadas[0] ?? "").includes("conteudo do arquivo de teste"), "o resultado da ferramenta voltou para o modelo");

/* comando negado: não roda */
aprovacoes.length = 0;
roteiro = [{ name: "rodar_comando", arguments: JSON.stringify({ comando: "echo oi > fora.txt" }) }, "texto"];
const r2 = await runOpenAi(
  {
    system: "teste",
    prompt: "rode um comando",
    model: "deepseek-chat",
    baseUrl: `http://127.0.0.1:${PORT}/v1`,
    apiKey: KEY,
    cwd: REPO,
    dataDir: DATA,
    signal: new AbortController().signal,
    approve: async (tool) => {
      aprovacoes.push(tool);
      return "deny";
    }
  },
  { onText: () => undefined, onTool: () => undefined }
);
check(aprovacoes[0] === "Bash", "rodar comando pede aprovação (Bash)");
check((pedidos.at(-1)?.chamadas[0] ?? "").includes("negou"), "negado, o modelo recebe a recusa");
check(!fs.existsSync(path.join(REPO, "fora.txt")), "o comando negado não escreveu nada");

/* escrita com aprovação */
aprovacoes.length = 0;
roteiro = [{ name: "escrever_arquivo", arguments: JSON.stringify({ caminho: "novo.txt", conteudo: "escrito" }) }, "texto"];
const r3 = await runOpenAi(
  {
    system: "teste",
    prompt: "escreva",
    model: "deepseek-chat",
    baseUrl: `http://127.0.0.1:${PORT}/v1`,
    apiKey: KEY,
    cwd: REPO,
    dataDir: DATA,
    signal: new AbortController().signal,
    approve: async (tool) => {
      aprovacoes.push(tool);
      return "allow";
    }
  },
  { onText: () => undefined, onTool: () => undefined }
);
check(aprovacoes[0] === "Write", "escrever arquivo pede aprovação (Write)");
check(fs.existsSync(path.join(REPO, "novo.txt")) && fs.readFileSync(path.join(REPO, "novo.txt"), "utf8") === "escrito", "com aprovação, o arquivo é gravado");
check(!r3.error, "escrita termina sem erro");

/* chave errada: mensagem clara */
const r4 = await runOpenAi(
  {
    system: "teste",
    prompt: "oi",
    model: "deepseek-chat",
    baseUrl: `http://127.0.0.1:${PORT}/v1`,
    apiKey: "sk-errada",
    cwd: REPO,
    dataDir: DATA,
    signal: new AbortController().signal,
    approve: async () => "deny"
  },
  { onText: () => undefined, onTool: () => undefined }
);
check(/chave da DeepSeek foi recusada/i.test(r4.error), "chave recusada vira mensagem em português");

fake.close();
console.log(problemas.length ? `\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}` : "\nDeepSeek: tudo certo");
process.exit(problemas.length ? 1 : 0);
