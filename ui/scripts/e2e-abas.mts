/*
 * Teste de ponta a ponta das abas de subagentes e do painel Tasks, com o modelo falso.
 * Roda depois do e2e-base (usa a sessão salva em CENTRAL_E2E_OUT/state.json).
 *   1. o orquestrador delega ao guardião → aparece a aba do subagente no topo,
 *      com o pedido, o que ele fez e a resposta devolvida;
 *   2. o agente chama a ferramenta tarefas → aparece o painel Tasks acima da caixa.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const URL_ = process.env.CENTRAL_E2E_URL || "http://localhost:4600";
const OUT = process.env.CENTRAL_E2E_OUT || "/tmp/central-e2e";
const problems: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", storageState: path.join(OUT, "state.json") });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`erro de JS: ${e.message}`));

const assistants = (p: Page) => p.locator("article.msg:not(.msg--user):not([data-testid=live])");

async function ask(p: Page, text: string, timeout = 120_000) {
  const before = await assistants(p).count();
  await p.fill("#composer", text);
  await p.keyboard.press("Enter");
  await p.waitForSelector("[data-testid=live]", { timeout: 15_000 }).catch(() => undefined);
  await p.waitForSelector("[data-testid=live]", { state: "detached", timeout });
  await p.waitForFunction((n) => document.querySelectorAll("article.msg:not(.msg--user):not([data-testid=live])").length > n, before, { timeout: 15_000 });
}

try {
  await page.goto(URL_ + "/");
  await page.waitForSelector("#composer");
  await page.waitForLoadState("networkidle");

  // 1. Delegação: o subagente também chama tarefas (se tiver a ferramenta).
  const tarefasSub = JSON.stringify({ itens: [{ titulo: "Ler o texto", status: "feito" }, { titulo: "Apontar ajustes", status: "fazendo" }] });
  await ask(page, `FALSO:agent:guardiao:revise este texto FALSO:read:README.md`);
  void tarefasSub;
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
  const cid = page.url().split("/").pop()!;

  await page.waitForSelector("[data-testid=subtabs]", { timeout: 10_000 });
  const tabs = page.locator("[data-testid=subtab]");
  check((await tabs.count()) >= 1, "aba do subagente aparece no topo do chat");
  check(/guardi/i.test(await tabs.first().innerText()), "a aba leva o nome do subagente (guardião)");
  check((await page.locator(".subchip").count()) >= 1, "a resposta mostra o chip do subagente");
  await page.screenshot({ path: path.join(OUT, "abas-1-conversa.png") });

  await tabs.first().click();
  await page.waitForSelector("[data-testid=subview]");
  const view = await page.locator("[data-testid=subview]").innerText();
  check(/pediu/i.test(view) && /revise este texto/.test(view), "a aba mostra o pedido de quem delegou");
  check(/Resposta para/i.test(view) && /FIM:/.test(view), "a aba mostra a resposta que o subagente devolveu");
  check(/concluído/.test(view), "o status do subagente é concluído");
  check((await page.locator("[data-testid=subview] .steps li").count()) >= 1, "a aba mostra o passo que o subagente fez (ferramenta lida da transcrição)");
  check(!/Subagent hand-back|harness:/.test(view), "a resposta aparece sem o embrulho do SDK");
  await page.screenshot({ path: path.join(OUT, "abas-2-subagente.png") });

  // Gravado na resposta: recarrega e a aba continua lá.
  await page.reload();
  await page.waitForSelector("[data-testid=subtab]", { timeout: 10_000 });
  check(true, "depois de recarregar, a aba do subagente continua (gravada na resposta)");
  const r = await (await context.request.get(`${URL_}/api/chat/${cid}`)).json();
  const subs = r.messages.flatMap((m: { meta: { subagents?: { agent: string; items: unknown[] }[] } }) => m.meta.subagents ?? []);
  console.log(`  subagentes gravados: ${JSON.stringify(subs.map((s: { agent: string; items: unknown[]; status?: string }) => ({ agent: s.agent, itens: s.items.length, status: s.status })))}`);
  check(subs.length >= 1 && subs[0].agent === "guardiao", "meta.subagents gravado com o guardião");

  // 2. Tasks na conversa principal (segunda mensagem vai direto, sem triagem).
  await page.locator("[data-testid=subtabs] [role=tab]").first().click();
  const tarefas = JSON.stringify({ itens: [{ titulo: "Gerar a arte", status: "feito" }, { titulo: "Mostrar a imagem", status: "feito" }, { titulo: "Publicar", status: "fazendo" }, { titulo: "Conferir no ar", status: "pendente" }] });
  await ask(page, `FALSO:central:tarefas:${tarefas}`);
  await page.waitForSelector("[data-testid=tasks]", { timeout: 10_000 });
  const t = await page.locator("[data-testid=tasks]").innerText();
  check(/Tasks/.test(t) && /2\/4/.test(t), `painel Tasks acima da caixa com 2/4 (${t.replace(/\s+/g, " ").slice(0, 80)})`);
  const open = await page.locator(".tasks__item").count();
  if (!open) await page.click(".tasks__head");
  check((await page.locator(".tasks__item").count()) === 4, "o painel lista os 4 itens");
  check(!(await page.locator(".steps").last().innerText().catch(() => "")).includes("tarefas"), "a chamada de tarefas não aparece como ação");
  await page.screenshot({ path: path.join(OUT, "abas-3-tasks.png") });

  // Tema claro também.
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await page.screenshot({ path: path.join(OUT, "abas-4-claro.png") });
} catch (e) {
  problems.push(`falhou: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  await page.screenshot({ path: path.join(OUT, "abas-erro.png") }).catch(() => undefined);
}

await browser.close();
fs.writeFileSync(path.join(OUT, "abas.json"), JSON.stringify({ problems }, null, 2));
console.log(problems.length ? `\n${problems.length} problema(s):\n- ${problems.join("\n- ")}` : "\ntudo certo");
process.exit(problems.length ? 1 : 0);
