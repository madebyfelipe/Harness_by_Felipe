/*
 * Modelo falso para testar a Central sem gastar uso da assinatura nem da API.
 * Fala o mínimo da API de mensagens da Anthropic e obedece a marcações no texto
 * do pedido, para o teste ser exato:
 *
 *   FALSO:bash:<comando>           chama o terminal
 *   FALSO:read:<arquivo>           lê um arquivo
 *   FALSO:write:<arquivo>          escreve "teste" num arquivo
 *   FALSO:agent:<nome>:<pedido>    delega ao subagente (o pedido pode ter outra marcação)
 *
 * Depois que a ferramenta volta, responde "FIM: <resultado da ferramenta>".
 * Sem marcação, responde "resposta-falsa: ok".
 *
 *   npx tsx scripts/modelo-falso.mts            (porta 4699)
 * A Central de teste sobe com ANTHROPIC_BASE_URL=http://127.0.0.1:4699 e
 * ANTHROPIC_API_KEY=teste. Nunca usar em produção.
 */
import http from "node:http";

const PORT = Number(process.env.FALSO_PORT || 4699);

type Block = { type: string; text?: string; content?: unknown; name?: string; input?: unknown };
type Msg = { role: string; content: string | Block[] };
type Body = { model?: string; stream?: boolean; messages?: Msg[]; tools?: { name: string }[] };
type Reply = { text: string } | { tool: string; input: Record<string, unknown> };

function flat(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((b: Block) => (b.type === "text" ? b.text ?? "" : b.type === "tool_result" ? flat(b.content) : "")).join("\n");
}

function decide(body: Body): Reply {
  const last = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
  if (!last) return { text: "resposta-falsa: ok" };
  const blocks = Array.isArray(last.content) ? last.content : [];
  const results = blocks.filter((b) => b.type === "tool_result");
  if (results.length) return { text: `FIM: ${results.map((r) => flat(r.content)).join(" | ").slice(0, 600)}` };

  const tools = new Set((body.tools ?? []).map((t) => t.name));
  const text = flat(last.content);
  const has = (name: string) => tools.has(name);
  let m = /FALSO:agent:([\w-]+):([^\n]+)/.exec(text);
  if (m) {
    const name = has("Agent") ? "Agent" : has("Task") ? "Task" : "";
    if (name) return { tool: name, input: { subagent_type: m[1], description: "teste", prompt: m[2].trim() } };
  }
  m = /FALSO:bash:([^\n]+)/.exec(text);
  if (m && has("Bash")) return { tool: "Bash", input: { command: m[1].trim(), description: "teste" } };
  m = /FALSO:read:(\S+)/.exec(text);
  if (m && has("Read")) return { tool: "Read", input: { file_path: m[1] } };
  m = /FALSO:write:(\S+)/.exec(text);
  if (m && has("Write")) return { tool: "Write", input: { file_path: m[1], content: "teste\n" } };
  if (/FALSO:/.test(text)) return { text: "resposta-falsa: ferramenta indisponível neste agente" };
  return { text: "resposta-falsa: ok" };
}

let n = 0;
const id = (p: string) => `${p}_falso_${Date.now().toString(36)}_${++n}`;

function asMessage(body: Body, reply: Reply) {
  const content = "text" in reply ? [{ type: "text", text: reply.text }] : [{ type: "tool_use", id: id("toolu"), name: reply.tool, input: reply.input }];
  return {
    id: id("msg"),
    type: "message",
    role: "assistant",
    model: body.model ?? "falso",
    content,
    stop_reason: "text" in reply ? "end_turn" : "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
  };
}

function stream(res: http.ServerResponse, body: Body, reply: Reply) {
  const msg = asMessage(body, reply);
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  send("message_start", { type: "message_start", message: { ...msg, content: [], stop_reason: null, usage: { ...msg.usage, output_tokens: 1 } } });
  if ("text" in reply) {
    send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    for (let i = 0; i < reply.text.length; i += 40) {
      send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: reply.text.slice(i, i + 40) } });
    }
  } else {
    const block = msg.content[0] as { id: string; name: string };
    send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: block.id, name: block.name, input: {} } });
    send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(reply.input) } });
  }
  send("content_block_stop", { type: "content_block_stop", index: 0 });
  send("message_delta", { type: "message_delta", delta: { stop_reason: msg.stop_reason, stop_sequence: null }, usage: { output_tokens: 5 } });
  send("message_stop", { type: "message_stop" });
  res.end();
}

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = (req.url ?? "").split("?")[0];
    const json = (code: number, data: unknown) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };
    if (req.method !== "POST") return json(404, { type: "error", error: { type: "not_found_error", message: "modelo falso" } });
    let body: Body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      return json(400, { type: "error", error: { type: "invalid_request_error", message: "json inválido" } });
    }
    if (url.endsWith("/count_tokens")) return json(200, { input_tokens: 10 });
    if (!url.endsWith("/v1/messages")) return json(404, { type: "error", error: { type: "not_found_error", message: "modelo falso" } });
    const reply = decide(body);
    console.log(`${new Date().toISOString().slice(11, 19)} ${body.model} ferramentas=${body.tools?.length ?? 0} → ${"text" in reply ? `texto: ${reply.text.slice(0, 70)}` : `${reply.tool} ${JSON.stringify(reply.input).slice(0, 90)}`}`);
    if (body.stream) stream(res, body, reply);
    else json(200, asMessage(body, reply));
  });
});
server.listen(PORT, "127.0.0.1", () => console.log(`modelo falso em http://127.0.0.1:${PORT}`));
