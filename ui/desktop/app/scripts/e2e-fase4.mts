/*
 * Fase 4 de ponta a ponta, com o modelo falso: cofre com escopo por agente, segredo por
 * referência ({{vault:NOME}}) que só entra depois da aprovação, navegador por agente com
 * bloqueio de rede interna e controle pelo Felipe, e colar imagem no chat.
 * Precisa da sessão do e2e-base. O navegador abre https://example.com (precisa de internet).
 */
import path from "node:path";
import { chromium } from "playwright-core";

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
page.on("dialog", (d) => void d.accept());
const DONE = "article.msg:not(.msg--user):not([data-testid=live])";
const post = async (url: string, data: unknown) => context.request.post(URL_ + url, { data, headers: { origin: URL_ } });

async function send(text: string): Promise<number> {
  const before = await page.locator(DONE).count();
  await page.fill("#composer", text);
  await page.click("button:has-text('Enviar')");
  return before;
}
async function answer(before: number): Promise<string> {
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel as string).length > (n as number), [DONE, before] as const, { timeout: 120_000 });
  await page.waitForSelector("[data-testid=live]", { state: "detached", timeout: 30_000 });
  return (await page.locator(DONE).last().innerText()).replace(/\s+/g, " ").trim();
}
/** Envia e responde ao cartão de aprovação, se aparecer. Devolve a resposta e o texto do cartão. */
async function ask(text: string, button: "Permitir" | "Negar"): Promise<{ a: string; card: string }> {
  const n = await send(text);
  let card = "";
  const first = await Promise.race([
    page.waitForSelector(".approval:not(form)", { timeout: 90_000 }).then(() => "card", () => "x"),
    page.waitForFunction(([sel, k]) => document.querySelectorAll(sel as string).length > (k as number), [DONE, n] as const, { timeout: 90_000 }).then(() => "done", () => "x")
  ]);
  if (first === "card") {
    card = (await page.innerText(".approval:not(form)")).replace(/\s+/g, " ");
    await page.click(`.approval:not(form) button:has-text('${button}')`);
  }
  return { a: await answer(n), card };
}
const call = (tool: string, input: unknown) => `FALSO:central:${tool}:${JSON.stringify(input)}`;

/* ---------- cofre: tela, escopo ---------- */
const VALOR = "segredo-fase4-774411";
await page.goto(URL_ + "/cofre");
await page.click("button:has-text('Novo segredo')");
await page.fill("[data-testid=cofre-form] input[name=name]", "FASE4_TOKEN");
await page.fill("[data-testid=cofre-form] input[name=value]", VALOR);
await page.uncheck("[data-testid=cofre-form] label:has-text('todos os agentes') input");
await page.check("[data-testid=cofre-form] label:has-text('programador') input");
await page.click("[data-testid=cofre-form] button:has-text('Guardar')");
await page.waitForSelector("[data-testid=segredo-FASE4_TOKEN]");
check(/só programador/.test(await page.innerText("[data-testid=segredo-FASE4_TOKEN]")), "segredo criado pela tela com escopo só para um agente");
check(!(await page.content()).includes(VALOR) && !(await (await context.request.get(URL_ + "/api/cofre")).text()).includes(VALOR), "o valor não volta para a tela nem pela API");
await page.screenshot({ path: path.join(OUT, "90-cofre.png") });

/* ---------- segredo por referência no terminal ---------- */
await post("/api/config", { autoApprove: true });
await page.goto(URL_ + "/");
await page.waitForSelector("#composer");
let r = await ask("FALSO:bash:echo {{vault:FASE4_TOKEN}} | wc -c", "Permitir");
check(!r.card && /Bloqueado pela Central/.test(r.a) && /escopo/.test(r.a), "agente fora do escopo não usa o segredo (nem chega a pedir aprovação)");
r = await ask("FALSO:bash:echo {{vault:NAO_EXISTE_X}} | wc -c", "Permitir");
check(!r.card && /não está no cofre/.test(r.a), "referência a segredo que não existe é barrada");
await post("/api/cofre/FASE4_TOKEN", { agents: ["*"] });
r = await ask("FALSO:bash:echo {{vault:FASE4_TOKEN}} | wc -c", "Permitir");
check(/\{\{vault:FASE4_TOKEN\}\}/.test(r.card) && !r.card.includes(VALOR), "o cartão mostra a referência, não o valor");
check(/usa um segredo do cofre/.test(r.card) && !/Sempre nesta conversa/.test(r.card), "comando com segredo sempre pede aprovação, mesmo no modo automático, e sem \"sempre\"");
check(new RegExp(`FIM: ${VALOR.length + 1}\\b`).test(r.a), "depois da aprovação o valor entra no comando (o tamanho confere)");
check(!(await page.content()).includes(VALOR), "o valor não aparece na conversa");
const uses = await (await context.request.get(URL_ + "/api/cofre")).json();
check(uses.uses.some((u: { name: string; agent: string }) => u.name === "FASE4_TOKEN" && u.agent === "orquestrador"), "o uso fica no registro do cofre, com o agente");

/* ---------- navegador ---------- */
r = await ask(call("navegador_abrir", { url: "http://127.0.0.1:4600/api/health" }), "Permitir");
check(/rede interna/.test(r.a), "navegador não abre endereço da rede interna");
r = await ask(call("navegador_abrir", { url: "https://example.com" }), "Permitir");
check(!r.card && /Example Domain/.test(r.a), "navegador abre um site e devolve o conteúdo (leitura roda sem cartão no modo automático)");
r = await ask(call("navegador_clicar", { alvo: "Learn more" }), "Negar");
check(/ação num site/.test(r.card), "clicar num site pede aprovação e diz por quê");
await page.goto(URL_ + "/navegadores");
await page.waitForSelector("[data-testid=navegador-orquestrador]");
await page.waitForFunction(() => (document.querySelector("[data-testid=navegador-orquestrador] img") as HTMLImageElement | null)?.naturalWidth === 1280, null, { timeout: 20_000 });
await page.screenshot({ path: path.join(OUT, "91-navegadores.png") });
check(/example\.com/.test(await page.innerText("[data-testid=navegador-orquestrador]")), "a tela Navegadores mostra o navegador do agente, com endereço e imagem ao vivo");
await page.click("[data-testid=navegador-orquestrador] button:has-text('Assumir controle')");
await page.waitForSelector("[data-testid=navegador-orquestrador] button:has-text('Devolver ao agente')");
const chat = await context.newPage();
await chat.goto(URL_ + "/");
await chat.waitForSelector("#composer");
await chat.fill("#composer", call("navegador_ler", {}));
await chat.click("button:has-text('Enviar')");
await chat.waitForSelector(`${DONE} >> text=/assumiu o controle/`, { timeout: 90_000 });
check(true, "com o controle com o Felipe, o agente é avisado para esperar");
await chat.close();
await page.fill("[data-testid=navegador-orquestrador] input[placeholder^='ir para']", "https://example.org");
await page.click("[data-testid=navegador-orquestrador] button:has-text('Ir')");
await page.waitForFunction(() => /example\.org/.test(document.querySelector("[data-testid=navegador-orquestrador]")?.textContent ?? ""), null, { timeout: 30_000 });
check(true, "com o controle assumido, o Felipe navega pela tela");
await page.click("[data-testid=navegador-orquestrador] button:has-text('Encerrar')");
await page.waitForSelector("[data-testid=navegador-orquestrador]", { state: "detached", timeout: 15_000 });
check(true, "encerrar fecha o navegador");
await post("/api/config", { autoApprove: false });

/* ---------- colar imagem no chat ---------- */
await page.goto(URL_ + "/");
await page.waitForSelector("#composer");
await page.focus("#composer");
await page.evaluate(() => {
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  const dt = new DataTransfer();
  dt.items.add(new File([png], "image.png", { type: "image/png" }));
  document.querySelector("#composer")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
});
await page.waitForSelector(".composer .tags .tag", { timeout: 20_000 });
check(/colado-\d+\.png/.test(await page.innerText(".composer .tags")), "imagem colada com Ctrl+V vira anexo");

await browser.close();
if (problems.length) {
  console.log("\nFALHOU:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nFase 4: tudo passou.");
