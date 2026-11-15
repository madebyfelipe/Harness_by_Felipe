/*
 * Teste da entrada do WhatsApp (Fase 3) sem tocar em número real: uma Evolution falsa em
 * http://127.0.0.1:4698 responde como a de verdade, e o banco/repositório são descartáveis.
 * Cobre: token do webhook, número estranho ignorado, "fb:" anotado, reenvio do mesmo evento,
 * e "pare". Não cobre: nota de voz (precisa de um ogg real) nem resposta do modelo.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA = "/tmp/central-entrada/dados";
const REPO = "/tmp/central-entrada/repo";
const PORT = 4698;
const FELIPE = "5515999998888";
const OUTRO = "5511977776666";

fs.rmSync("/tmp/central-entrada", { recursive: true, force: true });
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(REPO, { recursive: true });
execFileSync("git", ["init", "-q"], { cwd: REPO });
execFileSync("git", ["config", "user.email", "t@t"], { cwd: REPO });
execFileSync("git", ["config", "user.name", "t"], { cwd: REPO });

process.env.CENTRAL_DATA_DIR = DATA;
process.env.CENTRAL_REPO_DIR = REPO;
process.env.CENTRAL_MODE = "local";
process.env.CENTRAL_PUBLIC_URL = "http://localhost:4600";
process.env.CENTRAL_SCHEDULER = "0";
process.env.CENTRAL_EVOLUTION_URL = `http://127.0.0.1:${PORT}`;
process.env.EVOLUTION_API_KEY = "chave-falsa";
process.env.CENTRAL_GIT_PUSH = "0";

const enviados: { numero: string; texto: string }[] = [];
const problemas: string[] = [];
const check = (ok: boolean, o: string) => {
  console.log(`${ok ? "✓" : "✗"} ${o}`);
  if (!ok) problemas.push(o);
};

const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = req.url ?? "";
    res.setHeader("content-type", "application/json");
    if (url.startsWith("/instance/fetchInstances")) {
      return res.end(JSON.stringify([{ name: "mbf", ownerJid: "5515888887777@s.whatsapp.net" }]));
    }
    if (url.startsWith("/instance/connectionState")) return res.end(JSON.stringify({ instance: { state: "open" } }));
    if (url.startsWith("/message/sendText")) {
      const b = JSON.parse(body || "{}") as { number?: string; text?: string };
      enviados.push({ numero: b.number ?? "", texto: b.text ?? "" });
      return res.end(JSON.stringify({ key: { id: "x" }, status: "PENDING" }));
    }
    if (url.startsWith("/webhook/find")) return res.end(JSON.stringify({ enabled: true, url: "http://x/api/whatsapp/webhook?token=y" }));
    if (url.startsWith("/webhook/set")) return res.end(JSON.stringify({ ok: true }));
    res.statusCode = 404;
    res.end("{}");
  });
});
await new Promise<void>((r) => fake.listen(PORT, "127.0.0.1", () => r()));

const { kvSet } = await import("../lib/db");
const { webhookToken } = await import("../lib/whatsapp");
const { POST } = await import("../app/api/whatsapp/webhook/route");

await kvSet("whatsapp.numero", FELIPE);
await kvSet("whatsapp.instancia", "mbf");
const token = await webhookToken();

const post = async (tokenUsado: string, evento: unknown) =>
  POST(
    new Request(`http://localhost:4600/api/whatsapp/webhook?token=${encodeURIComponent(tokenUsado)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evento)
    })
  );

const evento = (id: string, jid: string, texto: string) => ({
  event: "messages.upsert",
  instance: "mbf",
  data: { key: { id, remoteJid: `${jid}@s.whatsapp.net`, fromMe: false }, pushName: "Felipe", message: { conversation: texto }, messageType: "conversation" }
});

/* token errado */
const r1 = await post("errado", evento("e0", FELIPE, "oi"));
check(r1.status === 401, "token errado é recusado (401)");

/* número que não é o Felipe */
await post(token, evento("e1", OUTRO, "fb: nao deveria anotar"));
await new Promise((r) => setTimeout(r, 400));
check(!enviados.length, "mensagem de outro número não é respondida");
check(!fs.existsSync(path.join(REPO, "feedback.md")) || !fs.readFileSync(path.join(REPO, "feedback.md"), "utf8").includes("nao deveria anotar"), "mensagem de outro número não é anotada");

/* feedback pela entrada */
const r2 = await post(token, evento("e2", FELIPE, "fb: entrada funcionando ponta a ponta"));
await new Promise((r) => setTimeout(r, 1200));
check(r2.status === 200, "webhook aceita o evento do Felipe (200)");
const fb = fs.existsSync(path.join(REPO, "feedback.md")) ? fs.readFileSync(path.join(REPO, "feedback.md"), "utf8") : "";
check(fb.includes("entrada funcionando ponta a ponta"), "fb: pela entrada grava em feedback.md");
check(enviados.some((e) => e.numero === FELIPE && /anotado/i.test(e.texto)), "resposta 'anotado' sai para o número do Felipe");

/* reenvio do mesmo evento */
const antes = enviados.length;
await post(token, evento("e2", FELIPE, "fb: entrada funcionando ponta a ponta"));
await new Promise((r) => setTimeout(r, 600));
check(enviados.length === antes, "reenvio do mesmo evento não roda de novo");

/* pare */
await post(token, evento("e3", FELIPE, "pare"));
await new Promise((r) => setTimeout(r, 800));
check(enviados.some((e) => /Parei/i.test(e.texto)), "'pare' responde Parei");

/* evento que não é mensagem */
const r3 = await post(token, { event: "connection.update", data: {} });
check(r3.status === 200, "evento de conexão é aceito e ignorado");

fake.close();
console.log(problemas.length ? `\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}` : "\nentrada do WhatsApp: tudo certo");
process.exit(problemas.length ? 1 : 0);
