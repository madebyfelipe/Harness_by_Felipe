import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Central desktop — o mesmo app da web, rodando na máquina do Felipe.
 *  - sobe o servidor Next (pasta servidor/, gerada por build.mjs) em 127.0.0.1, numa porta livre;
 *  - guarda dados em ~/.central e a configuração (agentes, skills, contexto) em ~/Central/config;
 *  - os projetos nascem em ~/Central/Projetos, mas podem apontar para qualquer pasta;
 *  - o seletor de pastas do app usa o diálogo nativo do sistema.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = app.isPackaged ? app.getAppPath() : HERE;
const APP_DIR = path.join(ROOT, "servidor");
const SERVER = path.join(APP_DIR, "server.js");

const DATA_DIR = process.env.CENTRAL_DATA_DIR || path.join(os.homedir(), ".central");
const CONFIG_DIR = process.env.CENTRAL_REPO_DIR || path.join(os.homedir(), "Central", "config");
const PROJECTS_DIR = process.env.CENTRAL_PROJECTS_DIR || path.join(os.homedir(), "Central", "Projetos");
const LOG = path.join(DATA_DIR, "desktop.log");
const PREFS = path.join(DATA_DIR, "desktop.json");
/** Central da VPS: a mesma conta e as mesmas conversas da web. */
const VPS_URL = (process.env.CENTRAL_VPS_URL || "https://chat.madebyfelipe.agency").replace(/\/+$/, "");
/** Sessão da VPS separada e gravada em disco: o login sobrevive a fechar o app. O local usa a sessão padrão. */
const PARTICAO = { local: undefined, vps: "persist:central-vps" };

let janela = null;
let servidor = null;
let servidorUrl = "";
let encerrando = false;
let modoAtual = "local";

function log(onde, texto) {
  const linha = `[${new Date().toISOString()}] ${onde}: ${String(texto).replace(/\s+$/g, "")}\n`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG, linha);
  } catch {
    /* sem log também não é motivo para não abrir */
  }
}

function lerPrefs() {
  try {
    return JSON.parse(fs.readFileSync(PREFS, "utf8")) || {};
  } catch {
    return {};
  }
}

function salvarPrefs(p) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(PREFS, JSON.stringify({ ...lerPrefs(), ...p }, null, 2));
}

/** "local" (servidor nesta máquina) ou "vps" (chat.madebyfelipe.agency). Pergunta na primeira vez. */
async function escolherModo() {
  const forcado = process.env.CENTRAL_DESKTOP_MODE;
  if (forcado === "local" || forcado === "vps") return forcado;
  const salvo = lerPrefs().modo;
  if (salvo === "local" || salvo === "vps") return salvo;
  const r = await dialog.showMessageBox({
    type: "question",
    title: "Central",
    message: "Onde a Central vai rodar?",
    detail: `Na VPS: entra com a mesma conta da web (${new URL(VPS_URL).host}) e vê as mesmas conversas, agentes e rotinas.\n\nNesta máquina: os agentes trabalham nas pastas deste computador com o Claude Code daqui.\n\nDá para trocar depois no menu Modo.`,
    buttons: ["Na VPS (mesma conta da web)", "Nesta máquina"],
    defaultId: 0,
    cancelId: 0
  });
  const modo = r.response === 1 ? "local" : "vps";
  salvarPrefs({ modo });
  return modo;
}

function trocarModo(modo) {
  if (modo === modoAtual) return;
  salvarPrefs({ modo });
  log("modo", `trocado para ${modo}; reiniciando`);
  app.relaunch();
  app.exit(0);
}

/** VPS fora do ar ou sem internet: oferece tentar de novo ou usar a Central local. */
async function vpsResponde() {
  for (;;) {
    try {
      const r = await fetch(`${VPS_URL}/api/health`, { signal: AbortSignal.timeout(10_000) });
      if (r.ok) return true;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      log("vps", `sem resposta: ${e instanceof Error ? e.message : e}`);
      const r = await dialog.showMessageBox({
        type: "warning",
        title: "Central",
        message: "A Central da VPS não respondeu.",
        detail: `${VPS_URL}\n\nConfira a internet. Se a VPS estiver fora do ar, dá para usar a Central nesta máquina.`,
        buttons: ["Tentar de novo", "Usar nesta máquina", "Sair"],
        defaultId: 0,
        cancelId: 2
      });
      if (r.response === 0) continue;
      if (r.response === 1) {
        trocarModo("local");
        return false;
      }
      app.quit();
      return false;
    }
  }
}

/** Primeira execução: copia a configuração que veio no instalador para uma pasta gravável. */
function prepararPastas() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const origem = path.join(APP_DIR, "config");
  if (!fs.existsSync(path.join(CONFIG_DIR, "agents")) && fs.existsSync(origem)) {
    fs.mkdirSync(path.dirname(CONFIG_DIR), { recursive: true });
    fs.cpSync(origem, CONFIG_DIR, { recursive: true });
    log("config", `copiada para ${CONFIG_DIR}`);
  }
  fs.mkdirSync(path.join(CONFIG_DIR, "agents"), { recursive: true });
  return CONFIG_DIR;
}

function porta() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

/** Node do sistema (preferido) ou o próprio Electron em modo Node. */
function acharNode() {
  const candidatos = [process.env.CENTRAL_NODE, "node"].filter(Boolean);
  for (const c of candidatos) {
    try {
      if (spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0) return { bin: c, env: {} };
    } catch {
      /* tenta o próximo */
    }
  }
  return { bin: process.execPath, env: { ELECTRON_RUN_AS_NODE: "1" } };
}

async function subirServidor() {
  if (!fs.existsSync(SERVER)) throw new Error(`O servidor não está montado em ${SERVER}. Rode "npm run montar" antes.`);
  const port = await porta();
  const node = acharNode();
  const env = {
    ...process.env,
    ...node.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    CENTRAL_MODE: "local",
    CENTRAL_DATA_DIR: DATA_DIR,
    CENTRAL_REPO_DIR: CONFIG_DIR,
    CENTRAL_PROJECTS_DIR: PROJECTS_DIR,
    CENTRAL_PUBLIC_URL: `http://127.0.0.1:${port}`,
    // No desktop o modelo é o Claude Code desta máquina; nada de segredos da VPS.
    CENTRAL_GIT_PUSH: "0"
  };
  servidor = spawn(node.bin, [SERVER], { cwd: APP_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
  servidor.stdout.on("data", (d) => log("servidor", d));
  servidor.stderr.on("data", (d) => log("servidor", d));
  servidor.on("exit", (code, sinal) => {
    log("servidor", `saiu (código ${code}, sinal ${sinal})`);
    if (!encerrando && janela) {
      dialog.showMessageBox(janela, {
        type: "error",
        title: "Central",
        message: "O servidor da Central parou.",
        detail: `Veja o log em ${LOG}.`,
        buttons: ["Fechar"]
      });
      app.quit();
    }
  });
  servidorUrl = `http://127.0.0.1:${port}`;
  log("servidor", `subindo com ${node.bin} em ${servidorUrl}`);

  for (let i = 0; i < 240; i++) {
    if (servidor.exitCode !== null) throw new Error(`O servidor saiu antes de responder. Log: ${LOG}`);
    try {
      const r = await fetch(`${servidorUrl}/api/health`);
      if (r.ok) return servidorUrl;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`O servidor não respondeu em 60 s. Log: ${LOG}`);
}

function criarJanela(url) {
  janela = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: "#ffffff",
    title: modoAtual === "vps" ? `Central · ${new URL(VPS_URL).host}` : "Central",
    icon: path.join(ROOT, "icon.png"),
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(ROOT, "preload.cjs"),
      partition: PARTICAO[modoAtual],
      // O preload só expõe as pastas do computador no modo local.
      additionalArguments: [`--central-modo=${modoAtual}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  janela.once("ready-to-show", () => janela.show());
  const daCentral = (alvo) => {
    try {
      return new URL(alvo).origin === new URL(servidorUrl).origin;
    } catch {
      return false;
    }
  };
  janela.webContents.setWindowOpenHandler(({ url: alvo }) => {
    if (/^https?:\/\//i.test(alvo) && !daCentral(alvo)) shell.openExternal(alvo);
    return { action: "deny" };
  });
  // Link para fora da Central abre no navegador do sistema, nunca dentro do app.
  janela.webContents.on("will-navigate", (e, alvo) => {
    if (daCentral(alvo)) return;
    e.preventDefault();
    if (/^https?:\/\//i.test(alvo)) shell.openExternal(alvo);
  });
  janela.webContents.on("did-fail-load", (_e, codigo, desc, alvo, principal) => {
    if (principal && codigo !== -3) log("janela", `falhou ${alvo}: ${desc} (${codigo})`);
  });
  janela.loadURL(url);
  janela.webContents.on("did-finish-load", () => log("janela", `carregou ${janela?.webContents.getURL() ?? url}`));
  janela.on("closed", () => (janela = null));
}

function menu() {
  const modelo = [
    {
      label: "Modo",
      submenu: [
        { label: `Na VPS (${new URL(VPS_URL).host}), mesma conta da web`, type: "radio", checked: modoAtual === "vps", click: () => trocarModo("vps") },
        { label: "Nesta máquina", type: "radio", checked: modoAtual === "local", click: () => trocarModo("local") },
        { type: "separator" },
        { label: "Abrir no navegador", click: () => shell.openExternal(servidorUrl || VPS_URL) }
      ]
    },
    {
      label: "Arquivo",
      submenu: [
        { label: "Abrir pasta de projetos", click: () => shell.openPath(PROJECTS_DIR) },
        { label: "Abrir pasta de dados", click: () => shell.openPath(DATA_DIR) },
        { label: "Abrir log", click: () => shell.openPath(LOG) },
        { type: "separator" },
        { role: "quit", label: "Sair" }
      ]
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo", label: "Desfazer" },
        { role: "redo", label: "Refazer" },
        { type: "separator" },
        { role: "cut", label: "Recortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Colar" },
        { role: "selectAll", label: "Selecionar tudo" }
      ]
    },
    {
      label: "Exibir",
      submenu: [
        { role: "reload", label: "Recarregar" },
        { role: "forceReload", label: "Recarregar sem cache" },
        { role: "toggleDevTools", label: "Ferramentas do desenvolvedor" },
        { type: "separator" },
        { role: "resetZoom", label: "Tamanho normal" },
        { role: "zoomIn", label: "Aumentar" },
        { role: "zoomOut", label: "Diminuir" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Tela cheia" }
      ]
    },
    {
      label: "Ajuda",
      submenu: [
        { label: "Pasta de configuração", click: () => shell.openPath(CONFIG_DIR) },
        {
          label: "Sobre a Central",
          click: () =>
            dialog.showMessageBox(janela, {
              type: "info",
              title: "Sobre a Central",
              message: `Central ${app.getVersion()}`,
              detail: modoAtual === "vps" ? `Modo VPS: ${VPS_URL}\nLog: ${LOG}` : `Modo local\nDados: ${DATA_DIR}\nConfiguração: ${CONFIG_DIR}\nProjetos: ${PROJECTS_DIR}`,
              buttons: ["OK"]
            })
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo));
}

function registrarIpc() {
  ipcMain.handle("central:escolher-pasta", async (_e, opcoes) => {
    const o = opcoes && typeof opcoes === "object" ? opcoes : {};
    const r = await dialog.showOpenDialog(janela, {
      title: typeof o.titulo === "string" ? o.titulo : "Escolher pasta do projeto",
      defaultPath: typeof o.inicial === "string" && o.inicial ? o.inicial : PROJECTS_DIR,
      properties: ["openDirectory", "createDirectory"]
    });
    return r.canceled ? null : r.filePaths[0] ?? null;
  });

  ipcMain.handle("central:criar-pasta", (_e, dados) => {
    const pai = String(dados?.pai ?? "");
    const nome = String(dados?.nome ?? "").trim();
    let existe = false;
    try {
      existe = path.isAbsolute(pai) && fs.statSync(pai).isDirectory();
    } catch {
      existe = false;
    }
    if (!existe) throw new Error("A pasta onde criar não existe.");
    if (!nome || /[\\/:*?"<>|]/.test(nome) || nome === "." || nome === ".." || nome.startsWith(".")) throw new Error("Nome de pasta inválido.");
    const alvo = path.join(pai, nome);
    if (!alvo.startsWith(pai + path.sep)) throw new Error("Nome de pasta inválido.");
    fs.mkdirSync(alvo, { recursive: true });
    return alvo;
  });

  ipcMain.handle("central:abrir-pasta", async (_e, caminho) => {
    const c = String(caminho ?? "");
    if (!path.isAbsolute(c)) return "caminho inválido";
    const erro = await shell.openPath(c);
    return erro || "ok";
  });

  ipcMain.handle("central:info", () => ({
    versao: app.getVersion(),
    plataforma: process.platform,
    dados: DATA_DIR,
    config: CONFIG_DIR,
    projetos: PROJECTS_DIR
  }));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!janela) return;
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  });

  app.whenReady().then(async () => {
    try {
      modoAtual = await escolherModo();
      log("modo", modoAtual);
      if (modoAtual === "vps") {
        servidorUrl = VPS_URL;
        menu();
        if (!(await vpsResponde())) return;
        criarJanela(VPS_URL);
        return;
      }
      menu();
      registrarIpc();
      prepararPastas();
      const url = await subirServidor();
      criarJanela(url);
    } catch (e) {
      log("inicio", e instanceof Error ? e.stack || e.message : String(e));
      dialog.showErrorBox("A Central não abriu", `${e instanceof Error ? e.message : String(e)}\n\nLog: ${LOG}`);
      app.quit();
    }
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    encerrando = true;
    if (servidor && servidor.exitCode === null) servidor.kill();
  });
}
