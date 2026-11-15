import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Mode = "vps" | "local";

export type Config = {
  mode: Mode;
  dataDir: string;
  repoDir: string;
  publicUrl: URL;
  databaseUrl: string;
  peerUrl: string;
  gitPush: boolean;
  claudePath: string;
  /** Pasta dos projetos criados automaticamente (fora do repositório). */
  projectsDir: string;
  /** Pastas extras liberadas para os agentes (`CENTRAL_ALLOWED_DIRS`). */
  allowedDirs: string[];
  tz: "America/Sao_Paulo";
};

/** Lê KEY=VALOR de um arquivo fora do repositório, sem sobrescrever o ambiente. */
export function loadEnvFile(file: string): void {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) process.env[key] = value;
  }
}

let cached: Config | undefined;

export function cfg(): Config {
  if (cached) return cached;
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.CENTRAL_DATA_DIR || path.join(os.homedir(), ".central"));
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  loadEnvFile(path.join(dataDir, "env"));

  const repoDir = path.resolve(/* turbopackIgnore: true */ process.env.CENTRAL_REPO_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".."));
  // Os agentes trabalham dentro do repositório; banco e chave mestra não podem morar lá.
  if (dataDir === repoDir || dataDir.startsWith(repoDir + path.sep)) {
    throw new Error("CENTRAL_DATA_DIR não pode ficar dentro do repositório de configuração.");
  }
  let publicUrl: URL;
  try {
    publicUrl = new URL(process.env.CENTRAL_PUBLIC_URL || "http://localhost:4600");
  } catch {
    throw new Error("CENTRAL_PUBLIC_URL inválida");
  }
  cached = {
    mode: process.env.CENTRAL_MODE === "vps" ? "vps" : "local",
    dataDir,
    repoDir,
    publicUrl,
    databaseUrl: process.env.DATABASE_URL || "",
    peerUrl: process.env.CENTRAL_PEER_URL || "",
    gitPush: process.env.CENTRAL_GIT_PUSH === "1",
    claudePath: process.env.CENTRAL_CLAUDE_PATH || "",
    projectsDir: path.resolve(/* turbopackIgnore: true */ process.env.CENTRAL_PROJECTS_DIR || path.join(os.homedir(), "Central", "Projetos")),
    // Separadas por `:` (Linux/macOS) ou `;` (Windows); `~` é expandido.
    allowedDirs: String(process.env.CENTRAL_ALLOWED_DIRS || "")
      .split(path.delimiter)
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => (d === "~" ? os.homedir() : d.startsWith("~/") || d.startsWith("~\\") ? path.join(os.homedir(), d.slice(2)) : d))
      .map((d) => path.resolve(/* turbopackIgnore: true */ d))
      .filter((d) => d !== "/" && d !== repoDir),
    tz: "America/Sao_Paulo"
  };
  return cached;
}

export function isSecureOrigin(): boolean {
  return cfg().publicUrl.protocol === "https:";
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Data e hora em Brasília, sempre com o fuso explícito (o servidor roda em UTC). */
export function fmtBrasilia(iso: string | Date, withSeconds = false): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {})
  }).format(d);
}
