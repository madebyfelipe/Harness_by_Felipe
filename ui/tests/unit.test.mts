import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

// Pasta de dados descartável e o repositório real como configuração.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "central-test-"));
process.env.CENTRAL_DATA_DIR = tmp;
process.env.CENTRAL_REPO_DIR = path.resolve(import.meta.dirname, "..", "..");

const { hotp, verifyTotp, base32Encode, base32Decode, totpCounter } = await import("../lib/totp");
const { encrypt, decrypt, hashPassword, verifyPassword, safeEqual } = await import("../lib/crypto");
const { parseFrontmatter, toList, stringifyFrontmatter } = await import("../lib/frontmatter");
const { nextModel, resolveModel } = await import("../lib/models");
const { toPgPlaceholders } = await import("../lib/db/types");
const { pathBlocked, toolInputBlocked, agentEnv } = await import("../lib/guardrails");
const { normalizeConnector, toYaml, listConnectors, mcpServersFor } = await import("../lib/connectors");
const { listAgents, listSkills, listContextFiles, readContextFile, safeRepoPath, searchContext } = await import("../lib/repo");
const { blockedFor, recordFailure } = await import("../lib/ratelimit");

test("TOTP: vetores da RFC 6238 (SHA-1)", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(hotp(secret, Math.floor(59 / 30)), "287082");
  assert.equal(hotp(secret, Math.floor(1111111109 / 30)), "081804");
  assert.equal(hotp(secret, Math.floor(1234567890 / 30)), "005924");
  assert.equal(base32Decode(secret).toString(), "12345678901234567890");
});

test("TOTP: aceita o código certo uma vez e recusa repetição", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  const at = 1_700_000_000_000;
  const code = hotp(secret, totpCounter(at));
  const used = verifyTotp(secret, code, 0, at);
  assert.equal(used, totpCounter(at));
  assert.equal(verifyTotp(secret, code, used!, at), null, "mesmo código de novo");
  assert.equal(verifyTotp(secret, "000000", 0, at) === null || hotp(secret, totpCounter(at)) === "000000", true);
  assert.equal(verifyTotp(secret, "abc", 0, at), null);
  assert.equal(verifyTotp(secret, hotp(secret, totpCounter(at) - 1), 0, at), totpCounter(at) - 1, "um passo de folga");
  assert.equal(verifyTotp(secret, hotp(secret, totpCounter(at) - 3), 0, at), null, "código velho");
});

test("cofre base: cifra, decifra e detecta adulteração", () => {
  const token = encrypt("segredo do totp");
  assert.notEqual(token, "segredo do totp");
  assert.equal(decrypt(token), "segredo do totp");
  const parts = token.split(".");
  parts[3] = Buffer.from("outro texto").toString("base64url");
  assert.throws(() => decrypt(parts.join(".")));
  assert.equal(fs.statSync(path.join(tmp, "master.key")).mode & 0o777, 0o600);
});

test("senha: scrypt confere e não vaza por igualdade", async () => {
  const stored = await hashPassword("uma senha bem comprida");
  assert.ok(stored.startsWith("scrypt$"));
  assert.equal(await verifyPassword("uma senha bem comprida", stored), true);
  assert.equal(await verifyPassword("uma senha bem comprid", stored), false);
  assert.equal(safeEqual("a", "a"), true);
  assert.equal(safeEqual("a", "b"), false);
});

test("frontmatter: formato de subagente do Claude Code", () => {
  const p = parseFrontmatter("---\nname: guardiao\ntools: Read, Bash\nmodel: haiku\n---\nCorpo\n");
  assert.equal(p.data.name, "guardiao");
  assert.deepEqual(toList(p.data.tools), ["Read", "Bash"]);
  assert.equal(p.body, "Corpo\n");
  assert.equal(parseFrontmatter("# Sem cabeçalho").hasFrontmatter, false);
  assert.equal(parseFrontmatter(stringifyFrontmatter({ name: "x" }, "oi")).data.name, "x");
});

test("modelos: apelidos e escada", () => {
  assert.equal(resolveModel("sonnet"), "claude-sonnet-5-5");
  assert.equal(resolveModel("fable"), "claude-fable-5-2");
  assert.equal(nextModel("claude-sonnet-5-5"), "claude-opus-5-5");
  assert.equal(nextModel("claude-sonnet-5-5", ["sonnet", "fable"]), "claude-fable-5-2");
  assert.equal(nextModel("claude-fable-5-2"), null);
});

test("SQL: ? vira $n sem tocar em texto entre aspas", () => {
  assert.equal(toPgPlaceholders("SELECT * FROM t WHERE a = ? AND b = '?' AND c = ?"), "SELECT * FROM t WHERE a = $1 AND b = '?' AND c = $2");
});

test("repositório: lê os agentes, skills e arquivos de contexto reais", () => {
  const agents = listAgents();
  const names = agents.map((a) => a.name);
  assert.equal(agents[0].name, "orquestrador");
  assert.equal(agents[0].model, "claude-fable-5-2");
  for (const n of ["guardiao", "programador", "qa-site", "redator-vendas", "enriquecedor", "pesquisador-leads", "analista-mercado"]) assert.ok(names.includes(n), n);
  assert.equal(agents.find((a) => a.name === "guardiao")!.model, "claude-haiku-5-5");
  assert.deepEqual(agents.find((a) => a.name === "guardiao")!.tools, ["Read"]);
  assert.ok(listSkills().some((s) => s.name === "email-personalizado"));
  const files = listContextFiles().map((f) => f.file);
  assert.ok(files.includes("contexto.md") && files.includes("openbot/rotinas.md"));
  assert.ok(!files.some((f) => f.startsWith("ui/")), "ui/ fica fora do contexto");
});

test("repositório: caminho não escapa e busca acha a oferta", () => {
  assert.equal(safeRepoPath("../etc/passwd"), null);
  assert.equal(safeRepoPath("ui/AUTH.md"), null);
  assert.equal(readContextFile("../../etc/passwd.md"), null);
  assert.equal(readContextFile("contexto.txt"), null);
  const hits = searchContext("599 pagina unica");
  assert.ok(hits.some((h) => h.file === "contexto.md"), "acha o preço sem acento");
  assert.deepEqual(searchContext("a"), []);
});

test("barreiras: caminhos e comandos de segredo são bloqueados", () => {
  const cwd = process.env.CENTRAL_REPO_DIR!;
  assert.ok(pathBlocked(path.join(tmp, "master.key"), cwd, tmp));
  assert.ok(pathBlocked("~/.claude/.credentials.json", cwd, tmp));
  assert.ok(pathBlocked("ui/.env.local", cwd, tmp));
  assert.ok(pathBlocked("/home/x/.ssh/id_ed25519", cwd, tmp));
  assert.equal(pathBlocked("contexto.md", cwd, tmp), null);
  assert.equal(pathBlocked("ui/.env.example", cwd, tmp), null);
  const uploads = path.join(tmp, "uploads", "c1");
  assert.equal(pathBlocked(path.join(uploads, "foto.png"), cwd, tmp, [uploads]), null, "anexo da conversa é liberado");
  assert.ok(toolInputBlocked("Read", { file_path: path.join(tmp, "central.db") }, cwd, tmp));
  assert.ok(toolInputBlocked("Bash", { command: "cat ~/.claude/.credentials.json" }, cwd, tmp));
  assert.ok(toolInputBlocked("Bash", { command: `sqlite3 ${tmp}/central.db .dump` }, cwd, tmp));
  assert.ok(toolInputBlocked("Bash", { command: "cat ui/.env.local | head" }, cwd, tmp));
  assert.equal(toolInputBlocked("Bash", { command: "git status && npm run build" }, cwd, tmp), null);
  assert.equal(toolInputBlocked("Bash", { command: `file ${uploads}/foto.png` }, cwd, tmp, [uploads]), null);
});

test("barreiras: o ambiente do agente não leva segredo de conector", () => {
  const env = agentEnv({ PATH: "/bin", HOME: "/h", TWENTY_API_KEY: "x", GITHUB_TOKEN: "y", CENTRAL_MASTER_KEY: "z", CENTRAL_SETUP_TOKEN: "t", DATABASE_URL: "pg", ANTHROPIC_API_KEY: "k", CLAUDE_CODE_SESSION_ID: "s", CLAUDECODE: "1" });
  assert.deepEqual(Object.keys(env).sort(), ["ANTHROPIC_API_KEY", "CLAUDE_AGENT_SDK_CLIENT_APP", "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS", "CLAUDE_CODE_DISABLE_CRON", "HOME", "PATH"]);
});

test("conectores: valida, grava YAML sem valor de segredo e lê os dois da base", () => {
  const c = normalizeConnector({ nome: "magnific", tipo: "mcp", segredo: "MAGNIFIC_KEY", mcp: { url: "https://exemplo.test/mcp" } });
  assert.equal(c.mcp!.nome, "magnific");
  assert.deepEqual(c.agentes, ["*"]);
  assert.ok(toYaml(c).includes("segredo: MAGNIFIC_KEY"));
  assert.throws(() => normalizeConnector({ nome: "Ruim Nome", tipo: "mcp", mcp: { url: "https://a.test" } }), /nome/);
  assert.throws(() => normalizeConnector({ nome: "x1", tipo: "mcp", mcp: { url: "http://inseguro.test" } }), /https/);
  assert.throws(() => normalizeConnector({ nome: "x1", tipo: "mcp", segredo: "sk-valor-colado", mcp: { url: "https://a.test" } }), /NOME/);
  assert.throws(() => normalizeConnector({ nome: "x1", tipo: "mcp" }), /mcp.url/);
  const { connectors, errors } = listConnectors();
  assert.deepEqual(errors, []);
  // O Felipe cria conectores pela tela (viram arquivos no repositório): só os dois da base são fixos.
  for (const base of ["github", "twenty"]) assert.ok(connectors.some((x) => x.nome === base), `falta o conector ${base}`);
  assert.equal(connectors.find((x) => x.nome === "twenty")!.mcp!.nome, "Twenty");
});

test("conectores: sem segredo definido, o agente não recebe o servidor MCP; com segredo, só o agente permitido", () => {
  delete process.env.TWENTY_API_KEY;
  delete process.env.GITHUB_TOKEN;
  const semSegredo = (o: Record<string, unknown>) => Object.keys(o).filter((k) => k === "Twenty" || k === "github");
  assert.deepEqual(semSegredo(mcpServersFor("orquestrador")), []);
  process.env.TWENTY_API_KEY = "chave-de-teste";
  const forRedator = mcpServersFor("redator-vendas");
  assert.deepEqual(semSegredo(forRedator), ["Twenty"]);
  assert.equal(forRedator.Twenty.headers!.Authorization, "Bearer chave-de-teste");
  assert.deepEqual(semSegredo(mcpServersFor("guardiao")), [], "guardião não está na lista do Twenty");
  delete process.env.TWENTY_API_KEY;
});

test("limite de tentativas: bloqueia depois do máximo e libera na janela seguinte", () => {
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) recordFailure("t:ip", 60_000, now);
  assert.ok(blockedFor("t:ip", 5, 60_000, now + 1000) > 0);
  assert.equal(blockedFor("t:ip", 5, 60_000, now + 61_000), 0);
});

test("limite da assinatura: mensagem traz a janela e a hora de Brasília, não a UTC do servidor", async () => {
  const { limitMessage } = await import("../lib/runner");
  const msg = limitMessage({ type: "five_hour", resetsAt: Date.UTC(2026, 10, 15, 2, 40) / 1000 });
  assert.match(msg, /janela de 5 horas/);
  assert.match(msg, /14\/11, 23:40 \(Brasília\)/);
  assert.match(limitMessage({}), /Limite de uso da assinatura/);
});

test("provedores: ordem de uso, conta no limite vai para o fim, tela nunca vê chave nem pasta", async () => {
  const { createProvider, listProviders, claudeChain, markLimited, moveProvider, publicProvider, claudeEnvFor, deleteProvider } = await import("../lib/providers");
  const a = await createProvider({ kind: "claude-api", name: "A", apiKey: "sk-ant-teste-a" });
  const b = await createProvider({ kind: "claude", name: "B" });
  await assert.rejects(() => createProvider({ kind: "claude-api", name: "ruim", apiKey: "nao-e-chave" }), /sk-ant-/);
  let chain = (await claudeChain()).map((p) => p.name);
  assert.deepEqual(chain, ["Conta da máquina", "A", "B"]);
  await moveProvider(b.id, -1);
  await moveProvider(b.id, -1);
  assert.deepEqual((await claudeChain()).map((p) => p.name), ["B", "Conta da máquina", "A"]);
  await markLimited(b.id, Math.floor(Date.now() / 1000) + 3600);
  assert.deepEqual((await claudeChain()).map((p) => p.name), ["Conta da máquina", "A", "B"]);
  assert.equal((await claudeChain(a.id))[0].name, "A", "provedor escolhido na conversa vem primeiro");
  const env = await claudeEnvFor((await listProviders()).find((p) => p.id === a.id)!);
  assert.equal(env.ANTHROPIC_API_KEY, "sk-ant-teste-a");
  const pub = JSON.stringify((await listProviders()).map(publicProvider));
  assert.ok(!pub.includes("sk-ant-teste-a") && !pub.includes('"home"'), "lista pública sem chave e sem pasta");
  await deleteProvider(a.id);
  await deleteProvider(b.id);
  await assert.rejects(() => deleteProvider("maquina"), /máquina/);
});
