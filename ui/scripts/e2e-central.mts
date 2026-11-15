/*
 * Teste de ponta a ponta das ferramentas de autonomia dos agentes (servidor MCP "central"),
 * com o modelo falso: pergunta por cartão, pedido de acesso que vai para o cofre sem passar
 * pelo modelo, rotina e app criados só depois da aprovação. Precisa da sessão do e2e-base.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const URL_ = process.env.CENTRAL_E2E_URL || "http://localhost:4600";
const OUT = process.env.CENTRAL_E2E_OUT || "/tmp/central-e2e";
const REPO = process.env.CENTRAL_E2E_REPO!;
const problems: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", storageState: path.join(OUT, "state.json") });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`erro de JS: ${e.message}`));
const DONE = "article.msg:not(.msg--user):not([data-testid=live])";

async function send(text: string): Promise<number> {
  const before = await page.locator(DONE).count();
  await page.fill("#composer", text);
  await page.click("button:has-text('Enviar')");
  return before;
}
async function answer(before: number): Promise<string> {
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel as string).length > (n as number), [DONE, before] as const, { timeout: 90_000 });
  await page.waitForSelector("[data-testid=live]", { state: "detached", timeout: 30_000 });
  return (await page.locator(DONE).last().innerText()).replace(/\s+/g, " ").trim();
}
const call = (tool: string, input: unknown) => `FALSO:central:${tool}:${JSON.stringify(input)}`;

await page.goto(URL_ + "/");
await page.waitForSelector("#composer");

/* pergunta */
let n = await send(call("perguntar_ao_felipe", { pergunta: "Qual plano entra na proposta?", opcoes: ["Essencial", "Completo"] }));
await page.waitForSelector("[data-testid=ask-pergunta]", { timeout: 60_000 });
check((await page.locator(".approval:not(form)").count()) === 0, "pergunta do agente abre o cartão direto, sem pedido de aprovação antes");
await page.screenshot({ path: path.join(OUT, "70-pergunta.png") });
await page.click("[data-testid=ask-pergunta] button:has-text('Completo')");
let a = await answer(n);
check(/Resposta do Felipe: Completo/.test(a), "a opção escolhida volta para o agente");

/* pedido de acesso */
const SEGREDO = "valor-secreto-e2e-918273";
n = await send(call("pedir_acesso", { segredo: "TESTE_E2E_TOKEN", motivo: "Ligar o app de teste.", onde_obter: "painel do serviço" }));
await page.waitForSelector("[data-testid=ask-acesso]", { timeout: 60_000 });
await page.screenshot({ path: path.join(OUT, "71-acesso.png") });
await page.fill("[data-testid=ask-acesso] input[type=password]", SEGREDO);
await page.click("[data-testid=ask-acesso] button:has-text('Guardar no cofre')");
a = await answer(n);
check(/Guardado no cofre como TESTE_E2E_TOKEN/.test(a), "o agente só fica sabendo que o segredo foi guardado");
check(!(await page.content()).includes(SEGREDO), "o valor do segredo não aparece na conversa");
const cofre = (await (await context.request.get(URL_ + "/api/cofre")).text());
check(cofre.includes("TESTE_E2E_TOKEN") && !cofre.includes(SEGREDO), "o segredo está no cofre e a API não devolve o valor");
n = await send(call("pedir_acesso", { segredo: "TESTE_E2E_TOKEN", motivo: "Pedir de novo." }));
a = await answer(n);
check(/já está definido/.test(a), "segredo que já existe não é pedido de novo");

/* rotina: só com aprovação */
const rotina = { nome: "teste-e2e-rotina", titulo: "Rotina de teste", quando: "todo dia às 08:00", instrucoes: "Diga oi e termine. Rotina criada pelo teste de ponta a ponta." };
n = await send(call("criar_rotina", rotina));
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.screenshot({ path: path.join(OUT, "72-rotina-aprovacao.png") });
await page.click(".approval:not(form) button:has-text('Negar')");
a = await answer(n);
check(!fs.existsSync(path.join(REPO, "routines/teste-e2e-rotina.yaml")), "rotina negada não é criada");
n = await send(call("criar_rotina", rotina));
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.click(".approval:not(form) button:has-text('Permitir')");
a = await answer(n);
const file = path.join(REPO, "routines/teste-e2e-rotina.yaml");
check(/criada e ligada/.test(a) && fs.existsSync(file), "rotina aprovada vira arquivo em routines/");
const yaml = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
check(/liberadas: \[\]/.test(yaml), "rotina criada por agente não libera ferramenta nenhuma sem aprovação");

/* app (MCP): só com aprovação, só https */
n = await send(call("conectar_app", { nome: "teste-e2e-app", titulo: "App de teste", url: "https://exemplo.test/mcp", uso: "Teste de ponta a ponta.", segredo: "OUTRO_E2E_TOKEN" }));
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.click(".approval:not(form) button:has-text('Permitir')");
a = await answer(n);
const app = path.join(REPO, "connectors/teste-e2e-app.yaml");
check(/conectado/.test(a) && /Falta o segredo OUTRO_E2E_TOKEN/.test(a) && fs.existsSync(app), "app aprovado vira arquivo em connectors/ e avisa do segredo que falta");
check(fs.existsSync(app) && !fs.readFileSync(app, "utf8").includes(SEGREDO), "o arquivo do app leva só o nome do segredo");
n = await send(call("listar_apps", {}));
a = await answer(n);
check(/teste-e2e-app/.test(a) && /OUTRO_E2E_TOKEN \(AUSENTE\)/.test(a), "listar apps roda sem aprovação e mostra o segredo ausente");

await browser.close();
if (problems.length) {
  console.log("\nFALHOU:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nFerramentas da Central: tudo passou.");
