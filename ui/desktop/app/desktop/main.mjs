import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Central desktop — o mesmo app da web, rodando na máquina do Felipe.
 *  - sobe o servidor Next (pasta app/, gerada por build.mjs) em 127.0.0.1, numa porta livre;
 *  - guarda dados em ~/.central e a configuração (agentes, skills, contexto) em ~/Central/config;
 *  - os projetos nascem em ~/Central/Projetos, mas podem apontar para qualquer pasta;
 *  - o seletor de pastas do app usa o diálogo nativo do sistema.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = app.isPackaged ? app.getAppPath() : HERE;
const APP_DIR = path.join(ROOT, "app");
const SERVER = path.join(APP_DIR, "server.js");

const DATA_DIR = process.env.CENTRAL_DATA_DIR || path.join(os.homedir(), ".central");
const CONFIG_DIR = process.env.CENTRAL_REPO_DIR || path.join(os.homedir(), "Central", "config");
const PROJECTS_DIR = process.env.CENTRAL_PROJECTS_DIR || path.join(os.homedir(), "Central", "Projetos");
const LOG = path.join(DATA_DIR, "desktop.log");

let janela = null;
let servidor = null;
let servidorUrl = "";
let encerrando = false;

function log(onde, texto) {
  const linha = `[${new Date().toISOString()}] ${onde}: ${String(texto).replace(/\s+$/g, "")}\n`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG, linha);
  } catch {
    /* sem log também não é motivo para não abrir */
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
    title: "Central",
    icon: path.join(ROOT, "icon.png"),
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(ROOT, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  janela.once("ready-to-show", () => janela.show());
  janela.webContents.setWindowOpenHandler(({ url: alvo }) => {
    if (/^https?:\/\//i.test(alvo) && !alvo.startsWith(servidorUrl)) shell.openExternal(alvo);
    return { action: "deny" };
  });
  janela.loadURL(url);
  janela.on("closed", () => (janela = null));
}

function menu() {
  const modelo = [
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
              detail: `Dados: ${DATA_DIR}\nConfiguração: ${CONFIG_DIR}\nProjetos: ${PROJECTS_DIR}`,
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
    if (!path.isAbsolute(pai) || !fs.statSync(pai).isDirectory()) throw new Error("A pasta onde criar não existe.");
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
    registrarIpc();
    menu();
    try {
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
