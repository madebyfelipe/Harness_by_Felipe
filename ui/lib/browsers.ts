import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import type { BrowserContext, Locator, Page } from "playwright-core";
import { cfg } from "./config";
import { scrubSecrets } from "./vault";

/*
 * Navegador por agente (Fase 4): um Chromium sem janela para cada agente que precisar,
 * com perfil próprio (cookies e logins ficam em <dados>/navegadores/<agente>, pasta que
 * nenhum agente lê). A tela Navegadores mostra a imagem ao vivo; o Felipe pode assumir o
 * controle (o agente espera), devolver ou encerrar.
 *
 * Barreiras: só http/https; nada de rede interna (localhost, IPs privados, a própria
 * Central); sem downloads; no máximo 2 navegadores; fecha sozinho depois de 15 min parado.
 */

type Sess = { agent: string; ctx: BrowserContext; page: Page; takenOver: boolean; lastUsed: number; lastAction: string; startedAt: number; sandbox: boolean };
const g = globalThis as unknown as { __centralBrowsers?: Map<string, Sess>; __centralBrowsersTimer?: NodeJS.Timeout; __centralDns?: Map<string, { bad: boolean; at: number }> };
const sessions = (g.__centralBrowsers ??= new Map<string, Sess>());
const dnsCache = (g.__centralDns ??= new Map<string, { bad: boolean; at: number }>());

const MAX = 2;
const IDLE_MS = 15 * 60_000;
const VIEW = { width: 1280, height: 800 };
const AGENT_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

function chromePath(): string {
  if (process.env.CENTRAL_CHROME && fs.existsSync(process.env.CENTRAL_CHROME)) return process.env.CENTRAL_CHROME;
  const root = path.join(os.homedir(), ".cache", "ms-playwright");
  try {
    for (const d of fs.readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      for (const rel of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-win/chrome.exe", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
        const p = path.join(root, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch {
    /* sem cache do playwright */
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) if (fs.existsSync(p)) return p;
  throw new Error("Não achei um Chromium nesta máquina. Instale com `npx playwright install chromium` ou defina CENTRAL_CHROME.");
}

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

/** Endereço que o navegador de agente não pode abrir: rede interna e a própria Central. */
export async function blockedHost(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(h)) return true;
  try {
    if (h === new URL(cfg().publicUrl).hostname.toLowerCase()) return true;
  } catch {
    /* publicUrl inválida */
  }
  if (net.isIP(h)) return privateIp(h);
  const hit = dnsCache.get(h);
  if (hit && Date.now() - hit.at < 60_000) return hit.bad;
  let bad = false;
  try {
    const all = await dns.lookup(h, { all: true });
    bad = !all.length || all.some((a) => privateIp(a.address));
  } catch {
    bad = false; // não resolve: o próprio navegador vai falhar
  }
  dnsCache.set(h, { bad, at: Date.now() });
  return bad;
}

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Só endereços http ou https.");
  return u.toString();
}

function sweep(): void {
  for (const s of sessions.values()) if (!s.takenOver && Date.now() - s.lastUsed > IDLE_MS) void closeBrowser(s.agent);
}

async function open(agent: string): Promise<Sess> {
  if (!AGENT_RE.test(agent)) throw new Error("Agente inválido.");
  const have = sessions.get(agent);
  if (have) return have;
  if (sessions.size >= MAX) throw new Error(`Já há ${MAX} navegadores abertos (${[...sessions.keys()].join(", ")}). Encerre um na tela Navegadores.`);
  const { chromium } = await import("playwright-core");
  const dir = path.join(cfg().dataDir, "navegadores", agent);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const launch = (sandbox: boolean) =>
    chromium.launchPersistentContext(dir, {
      executablePath: chromePath(),
      headless: true,
      viewport: VIEW,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      acceptDownloads: false,
      args: ["--disable-dev-shm-usage", ...(sandbox ? [] : ["--no-sandbox"])]
    });
  let ctx: BrowserContext;
  let sandbox = true;
  try {
    ctx = await launch(true);
  } catch {
    // Dentro de contêiner o isolamento do Chromium costuma não subir; segue sem ele (fica anotado na tela).
    sandbox = false;
    ctx = await launch(false);
  }
  await ctx.route("**/*", async (route) => {
    try {
      const u = new URL(route.request().url());
      if ((u.protocol === "http:" || u.protocol === "https:") && (await blockedHost(u.hostname))) return await route.abort("blockedbyclient");
      if (!["http:", "https:", "data:", "blob:", "about:"].includes(u.protocol)) return await route.abort("blockedbyclient");
      await route.continue();
    } catch {
      await route.abort().catch(() => undefined);
    }
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  // Aba nova (target=_blank): segue nela e fecha a antiga, para a tela mostrar sempre a aba em uso.
  const s: Sess = { agent, ctx, page, takenOver: false, lastUsed: Date.now(), lastAction: "aberto", startedAt: Date.now(), sandbox };
  ctx.on("page", (p) => {
    const old = s.page;
    s.page = p;
    if (old !== p) void old.close().catch(() => undefined);
  });
  ctx.on("close", () => sessions.delete(agent));
  sessions.set(agent, s);
  if (!g.__centralBrowsersTimer) {
    g.__centralBrowsersTimer = setInterval(sweep, 60_000);
    g.__centralBrowsersTimer.unref?.();
  }
  return s;
}

const touch = (s: Sess, action: string) => {
  s.lastUsed = Date.now();
  s.lastAction = action.slice(0, 140);
};
const settle = (p: Page) => p.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);

function forAgent(agent: string): Sess {
  const s = sessions.get(agent);
  if (!s) throw new Error("Não há navegador aberto. Use navegador_abrir primeiro.");
  if (s.takenOver) throw new Error("O Felipe assumiu o controle deste navegador. Espere ele devolver; não tente de novo agora.");
  return s;
}

/* ---------- o que o agente faz ---------- */

export async function agentOpen(agent: string, rawUrl: string): Promise<string> {
  const url = normalizeUrl(rawUrl);
  if (await blockedHost(new URL(url).hostname)) throw new Error("Endereço de rede interna: bloqueado.");
  const s = await open(agent);
  if (s.takenOver) throw new Error("O Felipe assumiu o controle deste navegador. Espere ele devolver.");
  touch(s, `abrir ${url}`);
  await s.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return agentRead(agent);
}

export async function agentRead(agent: string): Promise<string> {
  const s = forAgent(agent);
  touch(s, "ler a página");
  let body = "";
  try {
    body = await s.page.locator("body").ariaSnapshot({ timeout: 8_000 });
  } catch {
    body = await s.page.innerText("body", { timeout: 5_000 }).catch(() => "");
  }
  const text = `URL: ${s.page.url()}\nTítulo: ${await s.page.title().catch(() => "")}\n\n${body.slice(0, 14_000)}${body.length > 14_000 ? "\n… (cortado)" : ""}`;
  return scrubSecrets(text);
}

async function firstVisible(cands: Locator[]): Promise<Locator | null> {
  for (const c of cands) {
    const l = c.first();
    if (await l.isVisible().catch(() => false)) return l;
  }
  return null;
}

export async function agentClick(agent: string, alvo: string): Promise<string> {
  const s = forAgent(agent);
  const p = s.page;
  const t = alvo.trim();
  const target = t.startsWith("css=")
    ? p.locator(t.slice(4)).first()
    : await firstVisible([p.getByRole("button", { name: t }), p.getByRole("link", { name: t }), p.getByRole("tab", { name: t }), p.getByRole("menuitem", { name: t }), p.getByRole("checkbox", { name: t }), p.getByLabel(t), p.getByText(t, { exact: true }), p.getByText(t)]);
  if (!target) throw new Error(`Não achei "${t}" na página. Leia a página de novo (navegador_ler) e use o texto exato do botão ou link.`);
  touch(s, `clicar em ${t}`);
  await target.click({ timeout: 8_000 });
  await settle(s.page);
  return agentRead(agent);
}

export async function agentType(agent: string, campo: string, valor: string, enviar: boolean, mostrar: string): Promise<string> {
  const s = forAgent(agent);
  const p = s.page;
  const t = campo.trim();
  const target = t.startsWith("css=")
    ? p.locator(t.slice(4)).first()
    : await firstVisible([p.getByLabel(t), p.getByPlaceholder(t), p.getByRole("textbox", { name: t }), p.getByRole("searchbox", { name: t }), p.getByRole("combobox", { name: t })]);
  if (!target) throw new Error(`Não achei o campo "${t}". Leia a página de novo (navegador_ler) e use o rótulo ou o texto de exemplo do campo.`);
  touch(s, `digitar em ${t}: ${mostrar}`);
  await target.fill(valor, { timeout: 8_000 });
  if (enviar) {
    await target.press("Enter");
    await settle(s.page);
  }
  return agentRead(agent);
}

export async function screenshot(agent: string): Promise<Buffer> {
  const s = sessions.get(agent);
  if (!s) throw new Error("Não há navegador aberto para este agente.");
  return s.page.screenshot({ type: "jpeg", quality: 60, timeout: 8_000 });
}

export async function agentShot(agent: string): Promise<Buffer> {
  touch(forAgent(agent), "captura da tela");
  return screenshot(agent);
}

export async function closeBrowser(agent: string): Promise<boolean> {
  const s = sessions.get(agent);
  if (!s) return false;
  sessions.delete(agent);
  await s.ctx.close().catch(() => undefined);
  return true;
}

/* ---------- o que o Felipe faz pela tela ---------- */

export type BrowserInfo = { agent: string; url: string; title: string; takenOver: boolean; lastAction: string; idleSecs: number; sandbox: boolean; width: number; height: number };

export async function listBrowsers(): Promise<BrowserInfo[]> {
  const out: BrowserInfo[] = [];
  for (const s of sessions.values()) {
    out.push({ agent: s.agent, url: s.page.url(), title: await s.page.title().catch(() => ""), takenOver: s.takenOver, lastAction: s.lastAction, idleSecs: Math.round((Date.now() - s.lastUsed) / 1000), sandbox: s.sandbox, ...VIEW });
  }
  return out.sort((a, b) => a.agent.localeCompare(b.agent));
}

export async function userAction(agent: string, a: { acao: string; x?: number; y?: number; texto?: string; tecla?: string; url?: string }): Promise<void> {
  if (a.acao === "abrir") {
    const s = await open(agent);
    s.takenOver = true;
    touch(s, "Felipe abriu e assumiu");
    if (a.url) await s.page.goto(normalizeUrl(a.url), { waitUntil: "domcontentloaded", timeout: 30_000 });
    return;
  }
  const s = sessions.get(agent);
  if (!s) throw new Error("Este navegador já foi encerrado.");
  if (a.acao === "encerrar") return void (await closeBrowser(agent));
  if (a.acao === "assumir") {
    s.takenOver = true;
    return touch(s, "Felipe assumiu o controle");
  }
  if (a.acao === "devolver") {
    s.takenOver = false;
    return touch(s, "Felipe devolveu o controle");
  }
  if (!s.takenOver) throw new Error("Assuma o controle antes de mexer na página.");
  s.lastUsed = Date.now();
  if (a.acao === "navegar") await s.page.goto(normalizeUrl(String(a.url ?? "")), { waitUntil: "domcontentloaded", timeout: 30_000 });
  else if (a.acao === "clique") await s.page.mouse.click(Math.max(0, Math.min(VIEW.width, Number(a.x) || 0)), Math.max(0, Math.min(VIEW.height, Number(a.y) || 0)));
  else if (a.acao === "texto") await s.page.keyboard.type(String(a.texto ?? "").slice(0, 2000));
  else if (a.acao === "tecla" && /^(Enter|Tab|Escape|Backspace|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown|Home|End|Delete)$/.test(String(a.tecla))) await s.page.keyboard.press(String(a.tecla));
  else if (a.acao === "rolar") await s.page.mouse.wheel(0, Number(a.y) || 400);
  else if (a.acao === "voltar") await s.page.goBack({ timeout: 15_000 }).catch(() => undefined);
  else throw new Error("Ação desconhecida.");
  await settle(s.page);
}
