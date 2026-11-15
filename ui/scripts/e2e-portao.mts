/*
 * Teste de ponta a ponta do portão de aprovação, com o modelo falso
 * (scripts/modelo-falso.mts). Não gasta uso: serve para conferir, a cada mudança,
 * que nenhuma ferramenta que altera algo roda sem o Felipe permitir.
 *
 * A Central precisa estar rodando com ANTHROPIC_BASE_URL apontando para o modelo
 * falso, e com a sessão salva pelo e2e-base em CENTRAL_E2E_OUT/state.json.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const URL_ = process.env.CENTRAL_E2E_URL || "http://localhost:4600";
const DATA = process.env.CENTRAL_E2E_DATA!;
const OUT = process.env.CENTRAL_E2E_OUT || "/tmp/central-e2e";
/** Cópia do repositório que a Central de teste usa (CENTRAL_REPO_DIR): triagem e feedback gravam lá. */
const REPO = process.env.CENTRAL_E2E_REPO || path.resolve(import.meta.dirname, "..", "..");
const WAV = process.env.CENTRAL_E2E_WAV || "";

const problems: string[] = [];
const info = (s: string) => console.log(`  ${s}`);
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", storageState: path.join(OUT, "state.json"), permissions: ["microphone"] });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`erro de JS: ${e.message}`));

const DONE = "article.msg:not(.msg--user):not([data-testid=live])";

/** "/" = conversa nova pronta (triagem). Contexto ainda tem o botão próprio. */
async function newChat(start: string, button?: string) {
  await page.goto(URL_ + start);
  if (button) {
    await page.click(`button:has-text("${button}")`);
    await page.waitForURL(/\/(chat|contexto)\/[0-9a-f-]{36}$/);
  }
  await page.waitForSelector("#composer");
}
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");

type Step = "permitir" | "sempre" | "negar" | "nenhum";
const BUTTON: Record<Exclude<Step, "nenhum">, string> = { permitir: "Permitir", sempre: "Sempre nesta conversa", negar: "Negar" };

/** Envia, responde ao pedido de aprovação (ou confere que não houve) e devolve a resposta e o cartão. */
async function ask(text: string, step: Step, p: Page = page): Promise<{ answer: string; card: string }> {
  const before = await p.locator(DONE).count();
  await p.fill("#composer", text);
  await p.click("button:has-text('Enviar')");
  let card = "";
  // O cartão ou a resposta final: o que vier primeiro.
  const first = await Promise.race([
    p.waitForSelector(".approval:not(form)", { timeout: 60_000 }).then(() => "card" as const, () => "timeout" as const),
    p.waitForFunction(([sel, n]) => document.querySelectorAll(sel as string).length > (n as number), [DONE, before] as const, { timeout: 60_000 }).then(() => "done" as const, () => "timeout" as const)
  ]);
  if (first === "card") {
    card = (await p.innerText(".approval:not(form)")).replace(/\s+/g, " ");
    if (step === "nenhum") await p.click(".approval:not(form) button:has-text('Negar')");
    else await p.click(`.approval:not(form) button:has-text('${BUTTON[step]}')`);
  }
  await p.waitForFunction(([sel, n]) => document.querySelectorAll(sel as string).length > (n as number), [DONE, before] as const, { timeout: 90_000 });
  await p.waitForSelector("[data-testid=live]", { state: "detached", timeout: 30_000 });
  return { answer: (await p.locator(DONE).last().innerText()).replace(/\s+/g, " ").trim(), card };
}

/* ---------------- orquestrador ---------------- */
await newChat("/");

let r = await ask("oi", "nenhum");
check(/resposta-falsa: ok/.test(r.answer) && !r.card, "a Central conversa com o modelo falso (nada de uso real neste teste)");
check(/\/chat\/[0-9a-f-]{36}$/.test(page.url()), "a conversa nasce no primeiro envio, sem escolher agente nem modo");
check(/Triagem · N1/i.test(r.answer) && /Orquestrador \(Sonnet 5\.5\)/i.test(r.answer), "toda mensagem passa pela triagem, que mostra nível, agente e modelo");

r = await ask("FALSO:bash:echo central-ok-$((6*7))", "permitir");
info(`cartão: ${r.card.slice(0, 150)}`);
check(/Bash/.test(r.card) && r.card.includes("echo central-ok-$((6*7))"), "terminal: até um echo vira pedido de aprovação, mostrando o comando inteiro");
check(/central-ok-42/.test(r.answer), "permitido, o comando roda (saída central-ok-42)");
await page.screenshot({ path: path.join(OUT, "41-chat-aprovacao.png") }).catch(() => undefined);

r = await ask("FALSO:bash:echo segundo-comando-$((3+4))", "negar");
check(!!r.card && /O Felipe negou/.test(r.answer) && !/segundo-comando-7/.test(r.answer), "negado, o comando não roda e o agente recebe a recusa");

const escrito = path.join(REPO, "e2e-nao-criar.txt");
fs.rmSync(escrito, { force: true });
r = await ask(`FALSO:write:${escrito}`, "negar");
check(/Write/.test(r.card) && !fs.existsSync(escrito), "escrita de arquivo pede aprovação e, negada, o arquivo não é criado");
r = await ask(`FALSO:write:${escrito}`, "permitir");
check(fs.existsSync(escrito), "escrita permitida cria o arquivo");
fs.rmSync(escrito, { force: true });

r = await ask("FALSO:read:subagentes.md", "nenhum");
check(!r.card && /FIM: .*\S/.test(r.answer) && !/Bloqueado/.test(r.answer), "leitura de arquivo do repositório roda sem pedir nada");

const key = fs.readFileSync(path.join(DATA, "master.key"), "utf8").trim();
r = await ask(`FALSO:read:${path.join(DATA, "master.key")}`, "nenhum");
check(!r.card && /Bloqueado pela Central/.test(r.answer), "ler a chave mestra é barrado antes de virar pedido de aprovação");
r = await ask(`FALSO:bash:cat ${path.join(DATA, "master.key")}`, "nenhum");
check(!r.card && /Bloqueado pela Central/.test(r.answer), "cat na chave mestra pelo terminal também é barrado, sem pedido");
r = await ask("FALSO:bash:cat ~/.claude/.credentials.json", "nenhum");
check(!r.card && /Bloqueado pela Central/.test(r.answer), "o login do Claude da máquina é barrado para o agente");
r = await ask("FALSO:read:ui/.env", "nenhum");
check(!r.card && /Bloqueado pela Central/.test(r.answer), "arquivo .env é barrado");
check(!(await page.content()).includes(key), "o conteúdo da chave mestra não aparece em lugar nenhum da conversa");

// Subagente: o portão vale para ele também, e o cartão diz quem pediu.
r = await ask("FALSO:agent:qa-site:FALSO:bash:echo sub-ok-$((2+3))", "permitir");
info(`cartão do subagente: ${r.card.slice(0, 150)}`);
check(/subagente qa-site/i.test(r.card) && /Bash/.test(r.card), "terminal de subagente também pede aprovação, com o nome dele no cartão");
check(/sub-ok-5/.test(r.answer), "permitido, o subagente roda e o resultado volta ao orquestrador");
r = await ask("FALSO:agent:guardiao:FALSO:bash:echo nao-devia", "nenhum");
check(!r.card && !/nao-devia\b(?!.*FALSO)/.test(r.answer.replace(/FALSO:bash:echo nao-devia/g, "")), "subagente sem terminal (guardião, só Read) não ganha terminal");

// "Sempre nesta conversa": o segundo comando não pergunta.
r = await ask("FALSO:bash:echo sempre-$((1+1))", "sempre");
check(!!r.card && /sempre-2/.test(r.answer), "\"Sempre nesta conversa\" libera e roda");
r = await ask("FALSO:bash:echo sempre-$((2+2))", "nenhum");
check(!r.card && /sempre-4/.test(r.answer), "depois disso, terminal nesta conversa não pergunta de novo");
r = await ask(`FALSO:bash:cat ${path.join(DATA, "master.key")}`, "nenhum");
check(/Bloqueado pela Central/.test(r.answer), "mesmo com terminal liberado, a barreira de segredo continua valendo");

// Conversa nova: a liberação não vaza. Recarregar com pedido pendente: o cartão volta. Parar: encerra.
await newChat("/");
await page.fill("#composer", "FALSO:bash:echo outra-conversa");
await page.click("button:has-text('Enviar')");
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
check(true, "a liberação \"sempre\" fica só na conversa em que foi dada");
await page.reload();
check(await page.waitForSelector(".approval:not(form)", { timeout: 15_000 }).then(() => true).catch(() => false), "recarregar a página com pedido pendente traz o cartão de volta");
await page.click("button:has-text('Parar')");
check(await page.waitForSelector("text=Execução parada por você.", { timeout: 30_000 }).then(() => true).catch(() => false), "\"Parar\" com pedido pendente encerra a execução sem rodar o comando");

/* ---------------- triagem: despejo, fb:, planejar:, feedback, áudio ---------------- */
await newChat("/");
r = await ask("FALSO:ideia:ideia-e2e-111 FALSO:feedback:feedback-e2e-222 ruim FALSO:decisao:decisao-e2e-333", "nenhum");
info(`despejo: ${r.answer.slice(0, 220)}`);
check(/Entendi 3 coisa/.test(r.answer) && /nenhuma tarefa/.test(r.answer), "despejo sem tarefa: a triagem resume em 1 linha e não roda agente");
check(/ideia-e2e-111/.test(read("milestones.md")) && /Entrada \(ideias\)/.test(read("milestones.md")), "ideia vai para Entrada em milestones.md");
check(/· ruim · "feedback-e2e-222/.test(read("feedback.md")), "feedback vai para feedback.md no formato do arquivo");
check(/decisao-e2e-333/.test(read("decisoes.md").split("\n## ").slice(0, 2).join("\n")), "decisão entra no topo de decisoes.md, com data");
check(/ideia → milestones\.md/.test(r.answer.replace(/\s+/g, " ")) || /milestones\.md/.test(r.answer), "o card da triagem mostra onde cada item foi anotado");

r = await ask("fb: fb-e2e-444 a lista lateral ficou boa", "nenhum");
check(/^.*anotado/.test(r.answer) && /fb-e2e-444/.test(read("feedback.md")), "\"fb: …\" anota direto em feedback.md e responde \"anotado\"");

r = await ask("planejar: FALSO:bash:echo plano-$((5+5))", "nenhum");
check(!r.card && /Diga vai para rodar/.test(r.answer), "\"planejar:\" mostra o plano e espera, sem rodar nada");
r = await ask("vai", "permitir");
check(/Bash/.test(r.card) && /plano-10/.test(r.answer), "\"vai\" roda o plano guardado (e o terminal continua pedindo aprovação)");

r = await ask("FALSO:contexto qual é o preço?", "nenhum");
check(/Contexto · Sonnet 5\.5/i.test(r.answer), "pergunta sobre o negócio a triagem manda para o Modo Contexto");

const before = (read("feedback.md").match(/· bom ·/g) ?? []).length;
await page.locator("article.msg:not(.msg--user)").first().locator("button:has-text('bom')").click();
await page.waitForSelector("text=feedback anotado");
check((read("feedback.md").match(/· bom ·/g) ?? []).length === before + 1, "botão \"bom\" na resposta grava em feedback.md com o lugar");

await page.click("summary[aria-label='Dar feedback']");
await page.fill("#fb-text", "comentario-e2e-555 tela de chat");
await page.click(".pop__panel button:has-text('Comentar')");
await page.waitForSelector(".pop__panel >> text=Anotado.");
check(/comentario-e2e-555/.test(read("feedback.md")) && /tela \/chat\//.test(read("feedback.md")), "botão fixo de feedback grava o comentário com a tela");

if (WAV && fs.existsSync(WAV)) {
  // jfk.wav: PCM 16 bits, mono, 16 kHz → Float32, como o navegador manda.
  const wav = fs.readFileSync(WAV);
  const data = wav.indexOf("data") + 8;
  const pcm = new Float32Array((wav.length - data) / 2);
  for (let i = 0; i < pcm.length; i++) pcm[i] = wav.readInt16LE(data + i * 2) / 32768;
  const t0 = Date.now();
  const res = await page.request.post(URL_ + "/api/transcrever", { headers: { origin: URL_, "content-type": "application/octet-stream" }, data: Buffer.from(pcm.buffer) });
  const body = (await res.json()) as { text?: string; error?: string };
  info(`transcrição (${Date.now() - t0} ms): ${body.text ?? body.error}`);
  check(res.ok() && (body.text ?? "").length > 20, "áudio transcrito na própria VPS (Whisper small, sem provedor)");
} else info("sem CENTRAL_E2E_WAV: transcrição de arquivo não conferida");

await newChat("/");
const transcreveu = page.waitForResponse((res) => res.url().endsWith("/api/transcrever"), { timeout: 180_000 });
await page.click("button.bigmic");
await page.waitForSelector("text=/Gravando/");
await page.waitForTimeout(2500);
await page.click("button.bigmic");
const tr = await transcreveu;
check(tr.status() === 200, "microfone: grava no navegador, decodifica para 16 kHz e a VPS transcreve");
await page.waitForSelector("[data-testid=live]", { state: "detached", timeout: 90_000 }).catch(() => undefined);

/* ---------------- Modo Contexto ---------------- */
await newChat("/contexto", "Fazer uma pergunta");
r = await ask("FALSO:read:contexto.md", "nenhum");
check(!r.card && /FIM: .*\S/.test(r.answer) && !/Bloqueado/.test(r.answer), "Modo Contexto lê os .md do repositório");
r = await ask("FALSO:read:ui/package.json", "nenhum");
check(!r.card && /Bloqueado pela Central: o Modo Contexto só lê os \.md/.test(r.answer), "Modo Contexto não lê arquivo que não seja .md");
r = await ask("FALSO:read:/etc/hostname.md", "nenhum");
check(!r.card && /Bloqueado pela Central/.test(r.answer), "Modo Contexto não lê .md de fora do repositório");
r = await ask("FALSO:bash:echo contexto-nao", "nenhum");
check(!r.card && /ferramenta indisponível/.test(r.answer), "Modo Contexto não tem terminal nem escrita");

/* ---------------- provedores: várias contas, troca automática, ChatGPT ---------------- */
await page.goto(URL_ + "/provedores");
await page.waitForSelector("[data-testid=provider-maquina]");
await page.click("[data-testid=provider-maquina] button:has-text('Conferir')");
await page.waitForFunction(() => /conectada/.test(document.querySelector("[data-testid=provider-maquina] [data-testid=status]")?.textContent ?? ""), null, { timeout: 30_000 });
check(true, "a conta da máquina é conferida sem gastar uso (mostra conectada)");

async function addProvider(kind: string, name: string, key = "") {
  await page.selectOption("#p-kind", kind);
  await page.fill("#p-name", name);
  if (key) await page.fill("#p-key", key);
  await page.click("form button:has-text('Adicionar')");
  await page.waitForSelector(`li:has-text("${name}")`);
}
await addProvider("claude-api", "Boa e2e", "sk-ant-ok-e2e");
await addProvider("claude-api", "Limitada e2e", "sk-ant-limite-e2e");
check(!(await page.content()).includes("sk-ant-limite-e2e"), "a chave salva não aparece de novo na tela");
for (let i = 0; i < 3; i++) {
  await page.click("button[aria-label='Subir Limitada e2e']").catch(() => undefined);
  await page.waitForTimeout(400);
}
const firstName = (await page.locator("ul[aria-label=Provedores] > li").first().textContent()) ?? "";
check(/Limitada e2e/.test(firstName), "dá para pôr uma conta em primeiro na ordem de uso");

await newChat("/");
r = await ask("oi", "nenhum");
info(`com a primeira conta no limite: ${r.answer.slice(0, 200)}`);
check(/resposta-falsa: ok/.test(r.answer) && /Troca de conta: .*Limitada e2e no limite/.test(r.answer), "conta no limite: a Central troca sozinha para a próxima e avisa na resposta");
await page.goto(URL_ + "/provedores");
await page.waitForSelector("li:has-text('Limitada e2e')");
check(/no limite até/.test((await page.locator("li:has-text('Limitada e2e')").textContent()) ?? ""), "a conta que bateu o limite aparece marcada com a hora de liberar");

await addProvider("claude", "Claude conta 2 e2e");
await page.click("li:has-text('Claude conta 2 e2e') button:has-text('Entrar')");
const link = page.locator("li:has-text('Claude conta 2 e2e') a:has-text('Abrir login da Anthropic')");
await link.waitFor({ timeout: 30_000 });
check(/^https:\/\/claude\.com\/.*oauth/.test((await link.getAttribute("href")) ?? ""), "outra conta Claude: Entrar abre o login oficial da Anthropic e pede o código");
await page.click("li:has-text('Claude conta 2 e2e') button:has-text('cancelar')");

await addProvider("codex", "ChatGPT e2e");
await page.click("li:has-text('ChatGPT e2e') button:has-text('Conferir')");
await page.waitForFunction(() => /não conectada/.test([...document.querySelectorAll("li")].find((l) => l.textContent?.includes("ChatGPT e2e"))?.textContent ?? ""), null, { timeout: 30_000 });
check(true, "ChatGPT pelo Codex: adicionado e conferido (sem login, aparece não conectado)");

await newChat("/");
await page.click("summary[aria-label='Mais opções']");
const codexId = await page.locator("#provider option", { hasText: "ChatGPT e2e" }).getAttribute("value");
await page.selectOption("#provider", codexId!);
await page.click("summary[aria-label='Mais opções']");
r = await ask("diga oi", "nenhum");
info(`ChatGPT sem login: ${r.answer.slice(0, 160)}`);
check(/chatgpt/i.test(r.answer) && /não está conectado|Abra Provedores/i.test(r.answer), "conversa posta no ChatGPT roda pelo Codex (sem login, explica como conectar)");

await page.goto(URL_ + "/provedores");
for (const name of ["Boa e2e", "Limitada e2e", "Claude conta 2 e2e", "ChatGPT e2e"]) {
  page.once("dialog", (d) => void d.accept());
  await page.click(`li:has-text("${name}") button:has-text('Remover')`);
  await page.waitForSelector(`li:has-text("${name}")`, { state: "detached" });
}
check(true, "provedores de teste removidos");

await browser.close();
if (problems.length) {
  console.error("\nFALHAS:");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
console.log("\nPortão de aprovação: tudo passou.");
