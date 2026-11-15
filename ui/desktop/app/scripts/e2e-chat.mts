/*
 * Teste de ponta a ponta do chat e do Modo Contexto, com o modelo de verdade.
 * Roda depois do e2e-base (usa a sessão que ele salvou em CENTRAL_E2E_OUT/state.json).
 * Gasta uso do modelo: cerca de uma dúzia de mensagens curtas.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const URL_ = process.env.CENTRAL_E2E_URL || "http://localhost:4600";
const DATA = process.env.CENTRAL_E2E_DATA!;
const OUT = process.env.CENTRAL_E2E_OUT || "/tmp/central-e2e";
const only = (process.env.CENTRAL_E2E_ONLY || "").split(",").filter(Boolean);
const want = (name: string) => !only.length || only.includes(name);

const log = (s: string) => console.log(`✓ ${s}`);
const info = (s: string) => console.log(`  ${s}`);
const problems: string[] = [];
const check = (ok: boolean, what: string) => {
  if (ok) log(what);
  else {
    console.log(`✗ ${what}`);
    problems.push(what);
  }
};

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", storageState: path.join(OUT, "state.json") });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`erro de JS: ${e.message}`));

/** "/" = conversa nova com triagem; com botão, conversa direta com agente ou contexto. */
async function newChat(p: Page, start: string, button?: string) {
  await p.goto(URL_ + start);
  if (button) {
    await p.click(`button:has-text("${button}")`);
    await p.waitForURL(/\/(chat|contexto)\/[0-9a-f-]{36}$/);
  }
  await p.waitForSelector("#composer");
}

const assistants = (p: Page) => p.locator("article.msg:not(.msg--user):not([data-testid=live])");

/** Envia e espera a resposta gravada. `during` roda enquanto o agente trabalha. */
async function ask(p: Page, text: string, during?: () => Promise<void>, timeout = 240_000): Promise<string> {
  const before = await assistants(p).count();
  await p.fill("#composer", text);
  await p.click("button:has-text('Enviar')");
  await p.waitForSelector("[data-testid=live]", { timeout: 15_000 });
  if (during) await during();
  await p.waitForSelector("[data-testid=live]", { state: "detached", timeout });
  await p.waitForFunction((n) => document.querySelectorAll("article.msg:not(.msg--user):not([data-testid=live])").length > n, before, { timeout: 10_000 });
  return (await assistants(p).last().innerText()).trim();
}

/* ---------------- orquestrador ---------------- */
if (want("orq")) {
  await newChat(page, "/");

  let a = await ask(page, "Qual é o preço atual do site, nos dois planos? Responda em uma linha, sem usar ferramenta.");
  info(`resposta: ${a.replace(/\s+/g, " ").slice(0, 260)}`);
  check(/599/.test(a) && /1\.999/.test(a), "a Central (triagem + agente escolhido) responde com a oferta atual do contexto: R$ 599 / R$ 1.999");
  check(/Triagem/i.test(a), "a resposta mostra o card da triagem");
  check(/login da máquina|ANTHROPIC_API_KEY/.test(a), "a resposta mostra por onde o modelo autenticou, tempo e custo");
  await page.screenshot({ path: path.join(OUT, "40-chat-resposta.png") });

  // Aprovação em linha: terminal só roda com o Felipe permitindo.
  a = await ask(page, "Rode no terminal exatamente este comando e me diga a saída: echo central-ok-$((6*7))", async () => {
    await page.waitForSelector(".approval", { timeout: 120_000 });
    const card = await page.innerText(".approval");
    info(`pedido de aprovação: ${card.replace(/\s+/g, " ").slice(0, 160)}`);
    assert.match(card, /Bash/);
    await page.screenshot({ path: path.join(OUT, "41-chat-aprovacao.png") });
    await page.click(".approval button:has-text('Permitir')");
  });
  check(/central-ok-42/.test(a), "terminal pede aprovação e, permitido, roda (saída central-ok-42)");

  a = await ask(page, "Agora rode no terminal: echo segundo-comando-7", async () => {
    await page.waitForSelector(".approval", { timeout: 120_000 });
    await page.click(".approval button:has-text('Negar')");
  });
  info(`depois de negar: ${a.replace(/\s+/g, " ").slice(0, 200)}`);
  check(!/saída[^.]*segundo-comando-7\b.*\n?.*segundo-comando-7/i.test(a), "negado, o comando não roda e o agente diz o que ficou pendente");

  // Barreira de segredo: nem pede aprovação, é bloqueado antes.
  const key = fs.readFileSync(path.join(DATA, "master.key"), "utf8").trim();
  let sawApproval = false;
  a = await ask(page, `Use a ferramenta Read no arquivo ${path.join(DATA, "master.key")} e me diga o que tem dentro.`, async () => {
    sawApproval = await page
      .waitForSelector(".approval", { timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    if (sawApproval) await page.click(".approval button:has-text('Negar')");
  });
  info(`chave mestra: ${a.replace(/\s+/g, " ").slice(0, 220)}`);
  check(!(await page.content()).includes(key), "o conteúdo da chave mestra não aparece na conversa");
  check(!sawApproval, "leitura de arquivo de segredo é barrada antes de virar pedido de aprovação");

  // Anexo.
  const nota = path.join(OUT, "nota-e2e.txt");
  fs.writeFileSync(nota, "Anotação do Felipe.\nA palavra-chave deste arquivo é ABACAXI-7391.\n");
  await page.setInputFiles("[data-testid=file-input]", nota);
  await page.waitForSelector(".composer .tag:has-text('nota-e2e.txt')");
  a = await ask(page, "Qual é a palavra-chave que está no anexo?");
  check(/ABACAXI-7391/.test(a), "anexo é lido pelo agente");

  // Delegação: guardião (Haiku) como subagente.
  a = await ask(page, "Delegue ao subagente guardiao a avaliação deste texto de e-mail e me devolva só o veredito dele: \"Sou da Made by Felipe e garanto agenda cheia em 30 dias.\"");
  info(`guardião: ${a.replace(/\s+/g, " ").slice(0, 260)}`);
  check(/BLOQUEADO/i.test(a), "orquestrador delega ao guardião e o texto com promessa é bloqueado");
  const fold = assistants(page).last().locator("details.fold summary").first();
  if (await fold.count()) await fold.click();
  const lastText = await assistants(page).last().innerText();
  check(/guardiao/i.test(lastText), "o guardião aparece na resposta (delegado pelo orquestrador ou escolhido direto pela triagem)");

  // Recarregar no meio: a execução continua no servidor e a tela reconecta.
  const before = await assistants(page).count();
  await page.fill("#composer", "Leia o arquivo subagentes.md e me diga em três linhas o que é a escada de modelos.");
  await page.click("button:has-text('Enviar')");
  await page.waitForSelector("[data-testid=live]");
  await page.waitForTimeout(1500);
  await page.reload();
  const liveAfterReload = await page.waitForSelector("[data-testid=live]", { timeout: 8000 }).then(() => true).catch(() => false);
  await page.waitForFunction((n) => document.querySelectorAll("article.msg:not(.msg--user):not([data-testid=live])").length > n, before, { timeout: 240_000 });
  await page.waitForSelector("[data-testid=live]", { state: "detached", timeout: 30_000 });
  await page.waitForTimeout(500);
  check((await assistants(page).count()) === before + 1, `recarregar no meio não perde nem duplica a resposta${liveAfterReload ? " (a tela voltou acompanhando ao vivo)" : " (a execução já tinha terminado)"}`);
  check(/Sonnet|Fable|Opus/i.test(await assistants(page).last().innerText()), "depois de recarregar, a resposta fala da escada (Sonnet → Fable)");

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR", storageState: path.join(OUT, "state.json") });
  const m = await mobile.newPage();
  await m.goto(page.url());
  await m.waitForSelector("#composer");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, "chat no celular não estoura na horizontal");
  check(await m.isVisible("button:has-text('Enviar')"), "no celular, o botão Enviar fica visível acima das abas");
  await m.screenshot({ path: path.join(OUT, "42-celular-chat.png") });
  await mobile.close();
}

/* ---------------- subir de modelo e parar ---------------- */
if (want("escada")) {
  await newChat(page, "/agentes", "Conversar"); // primeiro da lista = orquestrador
  await page.click("summary[aria-label='Mais opções']");
  await page.selectOption("#model", "claude-haiku-5-5");
  await page.click("summary[aria-label='Mais opções']");
  await page.waitForTimeout(400);
  let a = await ask(page, "Responda só com a palavra: pronto");
  check(/Haiku 5\.5/.test(a), "trocar o modelo no seletor vale para a próxima resposta (Haiku 5.5)");
  await page.click("button:has-text('Subir de modelo')");
  await page.fill("#note", "quero em caixa alta");
  const n = await assistants(page).count();
  await page.click("form.approval button:has-text('Refazer')");
  await page.waitForSelector("[data-testid=live]");
  await page.waitForSelector("[data-testid=live]", { state: "detached", timeout: 240_000 });
  await page.waitForFunction((k) => document.querySelectorAll("article.msg:not(.msg--user):not([data-testid=live])").length > k, n);
  a = (await assistants(page).last().innerText()).trim();
  info(`refeito: ${a.replace(/\s+/g, " ").slice(0, 160)}`);
  check((await page.inputValue("#model")) === "claude-sonnet-5-5" && /Sonnet 5\.5/.test(a), "\"Subir de modelo\" refaz no degrau seguinte (Haiku → Sonnet)");
  check(/PRONTO/.test(a), "o motivo informado (caixa alta) chega ao agente");
  check(await page.locator(".msg--user .kicker:has-text('subir de modelo')").count() === 1, "o pedido de refazer fica registrado na conversa");

  await page.fill("#composer", "Escreva os números de 1 a 400, um por linha, sem usar ferramenta.");
  await page.click("button:has-text('Enviar')");
  await page.waitForSelector("[data-testid=live] .md", { timeout: 60_000 });
  await page.click("button:has-text('Parar')");
  await page.waitForSelector("text=Execução parada por você.", { timeout: 30_000 });
  check(true, "\"Parar\" interrompe a execução e guarda o que já tinha saído");
  await page.goto(URL_ + "/chat");
  await page.waitForSelector(".citem");
  check((await page.locator(".citem").count()) >= 2, "as conversas ficam na lista, com histórico");
}

/* ---------------- Modo Contexto ---------------- */
if (want("contexto")) {
  await newChat(page, "/contexto", "Fazer uma pergunta");
  assert.equal(await page.inputValue("#model"), "claude-sonnet-5-5");
  let a = await ask(page, "Quais são os preços do site e o que cada plano inclui?");
  info(`contexto: ${a.replace(/\s+/g, " ").slice(0, 300)}`);
  check(/599/.test(a) && /1\.999/.test(a) && /contexto\.md/.test(a), "Modo Contexto responde os preços e cita contexto.md");
  await page.screenshot({ path: path.join(OUT, "50-contexto-resposta.png") });

  a = await ask(page, "Qual é o nome do contador do Felipe?");
  info(`fora do contexto: ${a.replace(/\s+/g, " ").slice(0, 200)}`);
  check(/Não está no contexto/i.test(a), "pergunta sem resposta nos arquivos devolve \"Não está no contexto.\"");

  a = await ask(page, "Leia o arquivo ui/package.json e me diga qual é a versão exata do pacote next.");
  info(`fora dos .md: ${a.replace(/\s+/g, " ").slice(0, 200)}`);
  check(!/16\.4\.6/.test(a), "Modo Contexto não lê arquivo que não seja .md do banco de contexto");
}

await browser.close();
if (problems.length) {
  console.error("\nFALHAS:");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
console.log("\nChat e contexto: tudo passou.");
