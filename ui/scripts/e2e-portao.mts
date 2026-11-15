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
const REPO = path.resolve(import.meta.dirname, "..", "..");

const problems: string[] = [];
const info = (s: string) => console.log(`  ${s}`);
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", storageState: path.join(OUT, "state.json") });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`erro de JS: ${e.message}`));

const DONE = "article.msg:not(.msg--user):not([data-testid=live])";

async function newChat(start: string, button: string) {
  await page.goto(URL_ + start);
  await page.click(`button:has-text("${button}")`);
  await page.waitForURL(/\/(chat|contexto)\/[0-9a-f-]{36}$/);
  await page.waitForSelector("#composer");
}

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
    p.waitForSelector(".approval:not(form)", { timeout: 60_000 }).then(() => "card" as const),
    p.waitForFunction(([sel, n]) => document.querySelectorAll(sel as string).length > (n as number), [DONE, before] as const, { timeout: 60_000 }).then(() => "done" as const)
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
await newChat("/", "Falar com o orquestrador");

let r = await ask("oi", "nenhum");
check(/resposta-falsa: ok/.test(r.answer) && !r.card, "a Central conversa com o modelo falso (nada de uso real neste teste)");

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
await newChat("/", "Falar com o orquestrador");
await page.fill("#composer", "FALSO:bash:echo outra-conversa");
await page.click("button:has-text('Enviar')");
await page.waitForSelector(".approval:not(form)", { timeout: 60_000 });
check(true, "a liberação \"sempre\" fica só na conversa em que foi dada");
await page.reload();
check(await page.waitForSelector(".approval:not(form)", { timeout: 15_000 }).then(() => true).catch(() => false), "recarregar a página com pedido pendente traz o cartão de volta");
await page.click("button:has-text('Parar')");
check(await page.waitForSelector("text=Execução parada por você.", { timeout: 30_000 }).then(() => true).catch(() => false), "\"Parar\" com pedido pendente encerra a execução sem rodar o comando");

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

await browser.close();
if (problems.length) {
  console.error("\nFALHAS:");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
console.log("\nPortão de aprovação: tudo passou.");
