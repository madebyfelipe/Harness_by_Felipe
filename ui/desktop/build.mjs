import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Monta o app desktop: roda a build do Next em modo standalone e junta tudo em desktop/app.
 *  - servidor/server.js    servidor da Central
 *  - servidor/.next/static arquivos estáticos
 *  - servidor/public       ícone e fontes
 *  - servidor/config       configuração inicial (agentes, skills, rotinas, contexto)
 *
 * Depois: `npm run app` (abre) ou `npm run dist:win` (instalador).
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI = path.resolve(HERE, "..");
const REPO = path.resolve(UI, "..");
const APP = path.join(HERE, "servidor");
const NEXT = path.join(UI, "node_modules", "next", "dist", "bin", "next");

function titulo(t) {
  console.log(`\n▸ ${t}`);
}

function falhar(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function tamanho(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    try {
      if (e.isDirectory()) total += tamanho(p);
      else if (e.isFile()) total += fs.statSync(p).size;
    } catch {
      /* link quebrado */
    }
  }
  return total;
}

if (!fs.existsSync(NEXT)) falhar(`Next não encontrado em ${NEXT}. Rode "npm install" em ui/.`);

// Limpa restos de builds anteriores ANTES: o Next copia para o pacote tudo o que achar
// dentro de ui/ (inclusive instaladores), e isso inflava o app sem necessidade.
fs.rmSync(APP, { recursive: true, force: true });
fs.rmSync(path.join(HERE, "dist"), { recursive: true, force: true });
fs.rmSync(path.join(HERE, "app"), { recursive: true, force: true });

titulo("Build do Next em modo standalone (desktop)");
const build = spawnSync(process.execPath, [NEXT, "build"], {
  cwd: UI,
  stdio: "inherit",
  env: { ...process.env, CENTRAL_DESKTOP: "1", NEXT_TELEMETRY_DISABLED: "1" }
});
if (build.status !== 0) falhar("A build falhou. Veja o erro acima.");

const standalone = path.join(UI, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) falhar("A build não gerou .next/standalone/server.js (confira output: standalone no next.config.ts).");

titulo("Juntando o servidor");
fs.mkdirSync(APP, { recursive: true });
fs.cpSync(standalone, APP, { recursive: true });
fs.cpSync(path.join(UI, ".next", "static"), path.join(APP, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(UI, "public"))) fs.cpSync(path.join(UI, "public"), path.join(APP, "public"), { recursive: true });

titulo("Copiando a configuração inicial");
const config = path.join(APP, "config");
fs.mkdirSync(config, { recursive: true });
for (const dir of ["agents", "connectors", "prompts", "routines", "skills"]) {
  const origem = path.join(REPO, dir);
  if (fs.existsSync(origem)) fs.cpSync(origem, path.join(config, dir), { recursive: true });
}
for (const arquivo of fs.readdirSync(REPO).filter((f) => f.endsWith(".md"))) {
  fs.copyFileSync(path.join(REPO, arquivo), path.join(config, arquivo));
}

// O SDK do Claude e o Playwright são externos à build; o Next costuma tracê-los, mas avisamos se faltarem.
for (const pacote of ["@anthropic-ai/claude-agent-sdk", "playwright-core"]) {
  if (!fs.existsSync(path.join(APP, "node_modules", ...pacote.split("/")))) {
    console.warn(`\n⚠ ${pacote} não entrou em servidor/node_modules — o app pode falhar ao rodar um agente.`);
  }
}

const mb = (tamanho(APP) / 1024 / 1024).toFixed(0);
console.log(`\n✓ Servidor montado em ${APP} (${mb} MB).`);
console.log('  Abrir:      npm run app');
console.log('  Instalador: npm run dist:win   (ou dist:linux)');
