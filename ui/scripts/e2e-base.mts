/*
 * Teste de ponta a ponta da base: conta, 2FA, passkey, páginas, contraste, conectores.
 * Precisa de uma instância recém-criada (pasta de dados vazia) rodando.
 *
 *   CENTRAL_E2E_URL=http://localhost:4600 CENTRAL_E2E_DATA=<pasta de dados> \
 *   CENTRAL_E2E_CHROME=<chromium> CENTRAL_E2E_OUT=<pasta de prints> npx tsx scripts/e2e-base.mts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, type Page } from "playwright-core";
import { hotp, totpCounter } from "../lib/totp";

const URL_ = process.env.CENTRAL_E2E_URL || "http://localhost:4600";
const DATA = process.env.CENTRAL_E2E_DATA!;
const OUT = process.env.CENTRAL_E2E_OUT || "/tmp/central-e2e";
const PASSWORD = "senha-de-teste-e2e-123";
/** Cópia do repositório que a Central de teste usa (CENTRAL_REPO_DIR); o teste cria e apaga arquivo lá. */
const REPO = process.env.CENTRAL_E2E_REPO || path.resolve("..");
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
fs.mkdirSync(OUT, { recursive: true });

const log = (s: string) => console.log(`✓ ${s}`);
const failures: string[] = [];

async function axe(page: Page, label: string) {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe é injetado na página
    const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] });
    return r.violations.map((v: { id: string; nodes: { target: string[]; failureSummary: string }[] }) => ({
      id: v.id,
      nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} — ${n.failureSummary.replace(/\s+/g, " ").slice(0, 160)}`)
    }));
  });
  if (result.length) failures.push(`${label}: ${JSON.stringify(result)}`);
  return result.length;
}

const browser = await chromium.launch({ executablePath: process.env.CENTRAL_E2E_CHROME, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR" });
const page = await context.newPage();
page.on("pageerror", (e) => failures.push(`erro de JS em ${page.url()}: ${e.message}`));

/* ---- 1. configuração inicial ---- */
await page.goto(URL_ + "/");
await page.waitForURL("**/configurar");
await page.screenshot({ path: path.join(OUT, "01-configurar.png") });

await page.fill("#token", "token-errado");
await page.fill("#password", PASSWORD);
await page.fill("#password2", PASSWORD);
await page.click("button:has-text('Continuar')");
await page.waitForSelector("[role=alert]:has-text('Token de configuração incorreto')");
log("token errado é recusado");

const token = fs.readFileSync(path.join(DATA, "setup-token"), "utf8").trim();
await page.fill("#token", token);
await page.fill("#password", "curta");
await page.fill("#password2", "curta");
await page.$eval("#password", (el) => el.removeAttribute("minlength"));
await page.$eval("#password2", (el) => el.removeAttribute("minlength"));
await page.click("button:has-text('Continuar')");
await page.waitForSelector("[role=alert]:has-text('12 caracteres')");
log("senha curta é recusada no servidor");

await page.fill("#password", PASSWORD);
await page.fill("#password2", PASSWORD);
await page.click("button:has-text('Continuar')");
await page.waitForSelector(".qr svg");
await page.click("summary:has-text('Não consigo ler o QR')");
const secret = (await page.textContent("details.fold p.mono"))!.trim();
assert.match(secret, /^[A-Z2-7]{32}$/);
await page.screenshot({ path: path.join(OUT, "02-segundo-fator.png") });

await page.fill("#code", "000000");
await page.click("button:has-text('Confirmar')");
await page.waitForSelector("[role=alert]:has-text('Código incorreto')");
let counter = totpCounter();
await page.fill("#code", hotp(secret, counter));
await page.click("button:has-text('Confirmar')");
await page.waitForSelector("[data-testid=recovery-codes]");
const recovery = await page.$$eval("[data-testid=recovery-codes] span", (els) => els.map((e) => e.textContent!.trim()));
assert.equal(recovery.length, 10);
assert.equal(fs.existsSync(path.join(DATA, "setup-token")), false, "token de configuração é apagado depois do uso");
log("conta criada com senha + 2FA; 10 códigos de recuperação; token apagado");

await page.click("a:has-text('Abrir a Central')");
await page.waitForURL("**/conta?primeira=1");

/* ---- 2. passkey (autenticador virtual do Chrome) ---- */
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true }
});
await page.fill("#pk-name", "Chrome de teste");
await Promise.all([page.waitForEvent("load"), page.click("button:has-text('Criar passkey')")]);
await page.waitForSelector(".list__title:has-text('Chrome de teste')");
log("passkey criada");

await page.click("button:has-text('Sair')");
await page.waitForURL("**/entrar");
await page.screenshot({ path: path.join(OUT, "03-entrar.png") });
assert.equal((await page.request.get(URL_ + "/api/status")).status(), 401, "depois de sair, a API fecha");

await page.click("button:has-text('Entrar com passkey')");
await page.waitForURL(URL_ + "/");
log("login com passkey");

/* ---- 3. senha + código ---- */
const logout = async () => {
  await page.goto(URL_ + "/conta");
  await page.click("button:has-text('Sair')");
  await page.waitForURL("**/entrar");
};
await logout();
await page.fill("#password", PASSWORD);
await page.fill("#code", hotp(secret, counter)); // mesmo código da configuração: não pode valer de novo
await page.click("button:has-text('Entrar com senha')");
await page.waitForSelector("[role=alert]:has-text('Senha ou código incorreto')");
log("código do app já usado é recusado");

await page.fill("#password", "senha-errada-123456");
await page.fill("#code", hotp(secret, counter + 1));
await page.click("button:has-text('Entrar com senha')");
await page.waitForSelector("[role=alert]:has-text('Senha ou código incorreto')");

await page.fill("#password", PASSWORD);
counter = Math.max(counter + 1, totpCounter());
await page.fill("#code", hotp(secret, counter));
await page.click("button:has-text('Entrar com senha')");
await page.waitForURL(URL_ + "/");
log("login com senha + código do app");

await logout();
await page.fill("#password", PASSWORD);
await page.fill("#code", recovery[0]);
await page.click("button:has-text('Entrar com senha')");
await page.waitForURL(URL_ + "/");
await logout();
await page.fill("#password", PASSWORD);
await page.fill("#code", recovery[0]);
await page.click("button:has-text('Entrar com senha')");
await page.waitForSelector("[role=alert]:has-text('Senha ou código incorreto')");
log("código de recuperação vale uma vez só");

await page.click("button:has-text('Entrar com passkey')");
await page.waitForURL(URL_ + "/");
assert.equal((await page.request.get(URL_ + "/configurar", { maxRedirects: 0 })).status(), 307, "com conta criada, /configurar não abre mais");
const again = await page.request.post(URL_ + "/api/setup/start", { headers: { origin: URL_ }, data: { token, name: "x", password: PASSWORD } });
assert.equal(again.status(), 409, "não dá para criar segunda conta");
log("configuração inicial fechada depois da primeira conta");

/* ---- 4. páginas, dois temas, contraste, celular ---- */
// [url, nome, seletor que prova que a tela abriu]
const pages: [string, string, string][] = [
  ["/", "chat", "#composer"],
  ["/inicio", "inicio", 'h1:has-text("Bom te ver")'],
  ["/chat", "conversas", "#clist-q"],
  ["/contexto", "contexto", 'h1:has-text("Contexto")'],
  ["/contexto/arquivo?f=contexto.md", "arquivo", 'h1:has-text("Contexto do negócio")'],
  ["/agentes", "agentes", 'h1:has-text("Agentes")'],
  ["/skills", "habilidades", 'h1:has-text("Habilidades")'],
  ["/conectores", "conectores", 'h1:has-text("Apps")'],
  ["/rotinas", "rotinas", 'h1:has-text("Rotinas")'],
  ["/provedores", "provedores", "[data-testid=provider-maquina]"],
  ["/conta", "conta", 'h1:has-text("Conta")']
];
let checked = 0;
for (const theme of ["light", "dark"] as const) {
  await page.evaluate((t) => localStorage.setItem("central-theme", t), theme);
  for (const [url, name, heading] of pages) {
    await page.goto(URL_ + url);
    await page.waitForSelector(heading);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    if (name === "conectores") await page.waitForSelector("[data-testid=conector-github]");
    await axe(page, `${name} (${theme})`);
    checked += 1;
    if (theme === "light" || ["chat", "inicio", "agentes"].includes(name)) await page.screenshot({ path: path.join(OUT, `10-${name}-${theme}.png`) });
  }
}
log(`${checked} telas conferidas com axe-core (WCAG 2.1 AA), claro e escuro`);

assert.ok((await page.$$("[data-testid^=agente-]")).length === 0);
await page.goto(URL_ + "/agentes");
const nAgents = fs.readdirSync(path.join(REPO, "agents")).filter((f) => f.endsWith(".md")).length;
assert.equal((await page.$$("[data-testid^=agente-]")).length, nAgents, `${nAgents} agentes lidos de agents/`);
log(`${nAgents} agentes lidos do repositório`);

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR", storageState: await context.storageState() });
const m = await mobile.newPage();
for (const [url, name, sel] of [["/", "chat", "#composer"], ["/chat", "conversas", "#clist-q"], ["/inicio", "inicio", "h1"], ["/agentes", "agentes", "h1"], ["/conectores", "conectores", "h1"], ["/contexto", "contexto", "h1"]] as const) {
  await m.goto(URL_ + url);
  await m.waitForSelector(sel);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) failures.push(`celular ${name}: página estoura ${overflow}px na horizontal`);
  assert.ok(await m.isVisible("nav.tabs"), "abas do celular visíveis");
  await axe(m, `${name} (celular)`);
  await m.screenshot({ path: path.join(OUT, `20-celular-${name}.png`) });
}
await m.goto(URL_ + "/chat");
await m.click("details.mode > summary");
await m.waitForSelector(".mode__panel");
await m.waitForFunction(() => document.querySelector(".mode__panel dd")?.textContent !== "…");
await m.screenshot({ path: path.join(OUT, "21-celular-modo.png") });
const modeText = await m.textContent(".mode__panel");
assert.match(modeText!, /VPS · você está aqui/);
assert.match(modeText!, /Worker\s*(offline|online)/);
await mobile.close();
log("celular (390px): sem estouro lateral, abas e seletor de modo funcionam");

/* ---- 5. contexto: busca sem modelo ---- */
await page.goto(URL_ + "/contexto");
await page.fill("#busca", "599 pagina unica");
await page.waitForSelector("ul[aria-label=Resultados] a");
const firstHit = await page.textContent("ul[aria-label=Resultados] a");
assert.match(firstHit!, /contexto\.md:\d+/);
await page.fill("#busca", "xyzzy-nao-existe");
await page.waitForSelector("text=Nada encontrado nos arquivos.");
log("busca no contexto acha o preço e cita arquivo:linha");

/* ---- 6. conectores ---- */
await page.goto(URL_ + "/conectores");
await page.click("[data-testid=conector-github] button:has-text('Testar')");
await page.waitForSelector("[data-testid=conector-github] button:has-text('Testar'):not([disabled])", { timeout: 40_000 });
await page.click("[data-testid=conector-github] button:has-text('Configurar')");
await page.waitForSelector("[data-testid=conector-github] ul.steps", { timeout: 40_000 });
const gh = await page.textContent("[data-testid=conector-github]");
console.log("  github:", gh!.replace(/\s+/g, " ").match(/(funcionando|com problema).*?(?=connectors\/)/)?.[0]);
assert.match(gh!, /funcionando/);
assert.match(gh!, /MCP: \d+ ferramentas/);

await page.click("[data-testid=conector-twenty] button:has-text('Testar')");
await page.waitForSelector("[data-testid=conector-twenty] button:has-text('Testar'):not([disabled])", { timeout: 40_000 });
await page.click("[data-testid=conector-twenty] button:has-text('Configurar')");
await page.waitForSelector("[data-testid=conector-twenty] ul.steps", { timeout: 40_000 });
const tw = await page.textContent("[data-testid=conector-twenty]");
assert.match(tw!, /com problema/);
assert.match(tw!, /TWENTY_API_KEY ausente/);
log("GitHub testado de verdade (API + MCP); Twenty acusa o segredo ausente");

await page.fill("#c-nome", "teste-e2e");
await page.fill("#c-titulo", "MCP de teste");
await page.fill("#c-url", "https://api.githubcopilot.com/mcp/");
await page.fill("#c-segredo", "GITHUB_TOKEN");
await page.check("input[name=agentes][value=programador]");
await page.click("button:has-text('Salvar e fazer commit')");
await page.waitForSelector(".notice:has-text('Salvo no repositório (commit')", { timeout: 20_000 });
console.log("  ", (await page.textContent(".notice:has-text('Salvo no repositório')"))!.trim());
const yaml = fs.readFileSync(path.join(REPO, "connectors", "teste-e2e.yaml"), "utf8");
assert.match(yaml, /segredo: GITHUB_TOKEN/);
assert.match(yaml, /- programador/);
assert.ok(!yaml.includes("ghu_") && !yaml.includes("ghp_"), "o YAML não leva o valor do segredo");
await page.click("[data-testid=conector-teste-e2e] button:has-text('Testar')");
await page.waitForSelector("[data-testid=conector-teste-e2e] button:has-text('Testar'):not([disabled])", { timeout: 40_000 });
await page.click("[data-testid=conector-teste-e2e] button:has-text('Configurar')");
await page.waitForSelector("[data-testid=conector-teste-e2e] ul.steps", { timeout: 40_000 });
assert.match((await page.textContent("[data-testid=conector-teste-e2e]"))!, /MCP: \d+ ferramentas/);
await page.screenshot({ path: path.join(OUT, "30-conectores-testados.png"), fullPage: true });
page.once("dialog", (d) => void d.accept());
await page.click("[data-testid=conector-teste-e2e] button:has-text('Remover')");
await page.waitForSelector("[data-testid=conector-teste-e2e]", { state: "detached" });
assert.equal(fs.existsSync(path.join(REPO, "connectors", "teste-e2e.yaml")), false);
log("MCP genérico: criado pela tela, commit feito, testado e removido");

const bad = await page.request.post(URL_ + "/api/conectores", { headers: { origin: URL_ }, data: { nome: "x-ruim", url: "http://169.254.169.254/latest", segredo: "" } });
assert.equal(bad.status(), 400, "URL sem https é recusada");

await context.storageState({ path: path.join(OUT, "state.json") });
fs.writeFileSync(path.join(OUT, "secret.txt"), secret, { mode: 0o600 });
await browser.close();

if (failures.length) {
  console.error("\nFALHAS:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("\nBase: tudo passou.");
