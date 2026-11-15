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
/** Abre o "Detalhes"/"Conteúdo" de um cartão, se estiver fechado. */
async function open(testid: string) {
  const d = page.locator(`[data-testid=${testid}] details.card__detail`);
  if (!(await d.evaluate((el) => (el as HTMLDetailsElement).open))) await page.click(`[data-testid=${testid}] summary`);
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

/* modo automático: o seguro roda sem cartão, o arriscado continua perguntando */
const cfg = async (on: boolean) => (await context.request.post(URL_ + "/api/config", { data: { autoApprove: on }, headers: { origin: URL_ } })).json();
check((await cfg(true)).autoApprove === true, "modo automático liga pela preferência");
await page.reload();
await page.waitForSelector("#composer");
n = await send("FALSO:bash:echo auto-ok | wc -c");
a = await answer(n);
check(/FIM: \d+/.test(a) && (await page.locator(".approval:not(form)").count()) === 0, "comando só de leitura roda sem pedir aprovação no modo automático");
n = await send("FALSO:bash:rm -rf logs-que-nao-existem");
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
const motivo = (await page.innerText(".approval:not(form)")).replace(/\s+/g, " ");
check(/Perguntei porque/.test(motivo), "comando que apaga continua pedindo aprovação e diz por quê");
await page.screenshot({ path: path.join(OUT, "73-auto-pergunta.png") });
await page.click(".approval:not(form) button:has-text('Negar')");
a = await answer(n);
n = await send("FALSO:write:agents/invasor.md");
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.click(".approval:not(form) button:has-text('Negar')");
a = await answer(n);
check(!fs.existsSync(path.join(REPO, "agents/invasor.md")), "escrever em agents/ pede aprovação mesmo no modo automático");
n = await send("FALSO:write:anotacao-e2e.md");
a = await answer(n);
check(fs.existsSync(path.join(REPO, "anotacao-e2e.md")), "arquivo de conteúdo do repositório é escrito sem cartão no modo automático");
await cfg(false);

/* agente e habilidade criados por agente: só com aprovação */
n = await send(call("criar_agente", { nome: "teste-e2e-agente", descricao: "Agente criado pelo teste de ponta a ponta. Não usar.", prompt: "Você é um agente de teste. Responda apenas ok e termine." }));
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.click(".approval:not(form) button:has-text('Permitir')");
a = await answer(n);
check(/criado/.test(a) && fs.existsSync(path.join(REPO, "agents/teste-e2e-agente.md")), "agente criado por agente vira arquivo em agents/ depois da aprovação");
n = await send(call("salvar_habilidade", { nome: "teste-e2e-skill", descricao: "Habilidade criada pelo teste de ponta a ponta.", conteudo: "1. Diga ok.\n2. Termine. Procedimento de teste." }));
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
await page.click(".approval:not(form) button:has-text('Permitir')");
a = await answer(n);
check(/criada/.test(a) && fs.existsSync(path.join(REPO, "skills/teste-e2e-skill/SKILL.md")), "habilidade salva por agente vira arquivo em skills/ depois da aprovação");

/* telas: criar, editar, pausar, duplicar, excluir, importar */
page.on("dialog", (d) => void d.accept());
await page.goto(URL_ + "/agentes");
await page.waitForSelector("[data-testid=agente-orquestrador]");
check((await page.locator("[data-testid=agente-teste-e2e-agente]").count()) === 1, "o agente criado aparece na tela Agentes");
await page.click("button:has-text('Novo agente')");
await page.fill("[data-testid=agente-form] input[name=name]", "tela-e2e");
await page.fill("[data-testid=agente-form] input[name=description]", "Agente criado pela tela no teste. Não usar.");
await page.fill("[data-testid=agente-form] input[name=tools]", "Read, Glob");
await page.fill("[data-testid=agente-form] textarea[name=prompt]", "Você é um agente de teste criado pela tela. Responda ok.");
await page.click("[data-testid=agente-form] button:has-text('Salvar')");
await page.waitForSelector("[data-testid=agente-tela-e2e]");
let md = fs.readFileSync(path.join(REPO, "agents/tela-e2e.md"), "utf8");
check(/^---\nname: tela-e2e/.test(md) && /tools: Read, Glob/.test(md) && /model: sonnet/.test(md), "novo agente pela tela grava cabeçalho no formato do Claude Code");
await open("agente-tela-e2e");
await page.click("[data-testid=agente-tela-e2e] button:has-text('Editar')");
await page.fill("[data-testid=agente-tela-e2e] textarea[name=prompt]", "Prompt editado pela tela no teste. Responda ok e termine.");
await page.screenshot({ path: path.join(OUT, "80-agente-editar.png") });
await page.click("[data-testid=agente-tela-e2e] button:has-text('Salvar')");
await page.waitForSelector("text=/Agente tela-e2e salvo/");
check(/Prompt editado pela tela/.test(fs.readFileSync(path.join(REPO, "agents/tela-e2e.md"), "utf8")), "editar agente regrava o arquivo");
await open("agente-tela-e2e");
await page.click("[data-testid=agente-tela-e2e] button:has-text('Pausar')");
await page.waitForSelector("[data-testid=agente-tela-e2e] .tag:has-text('pausado')");
check(/pausado: true/.test(fs.readFileSync(path.join(REPO, "agents/tela-e2e.md"), "utf8")), "pausar marca o agente no arquivo");
const lista = await (await context.request.post(URL_ + "/api/chat", { data: { mode: "chat", agent: "tela-e2e" }, headers: { origin: URL_ } })).json();
const envio = lista.conversation ? await context.request.post(URL_ + `/api/chat/${lista.conversation.id}/messages`, { data: { text: "oi" }, headers: { origin: URL_ } }) : null;
check(!envio || envio.status() >= 400, "agente pausado não roda");
await open("agente-orquestrador");
check((await page.locator("[data-testid=agente-orquestrador] button:has-text('Excluir')").count()) === 0, "orquestrador não tem botão de excluir nem de pausar");
await open("agente-tela-e2e");
await page.click("[data-testid=agente-tela-e2e] button:has-text('Excluir')");
await page.waitForSelector("[data-testid=agente-tela-e2e]", { state: "detached" });
check(!fs.existsSync(path.join(REPO, "agents/tela-e2e.md")), "excluir tira o arquivo do repositório");
if (await page.locator("button:has-text('Importar do OpenBot')").count()) {
  await page.click("button:has-text('Importar do OpenBot')");
  await page.waitForSelector("text=/Importados como rascunho pausado/");
  await page.waitForSelector("[data-testid=agente-dylan]");
  check(/pausado: true/.test(fs.readFileSync(path.join(REPO, "agents/dylan.md"), "utf8")), "importar do OpenBot cria rascunhos pausados");
} else check(false, "botão de importar do OpenBot não apareceu");
await page.screenshot({ path: path.join(OUT, "81-agentes.png"), fullPage: true });

await page.goto(URL_ + "/skills");
await page.click("button:has-text('Nova habilidade')");
await page.fill("[data-testid=skill-form] input[name=name]", "tela-e2e-skill");
await page.fill("[data-testid=skill-form] input[name=description]", "Habilidade criada pela tela no teste.");
await page.fill("[data-testid=skill-form] textarea[name=body]", "1. Passo de teste.\n2. Termine o procedimento.");
await page.click("[data-testid=skill-form] button:has-text('Salvar')");
await page.waitForSelector("[data-testid=skill-tela-e2e-skill]");
check(fs.existsSync(path.join(REPO, "skills/tela-e2e-skill/SKILL.md")), "nova habilidade pela tela vira skills/<nome>/SKILL.md");
await open("skill-tela-e2e-skill");
await page.click("[data-testid=skill-tela-e2e-skill] button:has-text('Excluir')");
await page.waitForSelector("[data-testid=skill-tela-e2e-skill]", { state: "detached" });
check(!fs.existsSync(path.join(REPO, "skills/tela-e2e-skill/SKILL.md")), "excluir habilidade tira o arquivo");

await browser.close();
if (problems.length) {
  console.log("\nFALHOU:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nFerramentas da Central: tudo passou.");
