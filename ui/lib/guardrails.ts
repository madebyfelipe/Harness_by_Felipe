import os from "node:os";
import path from "node:path";

/*
 * Barreiras que não dependem do modelo obedecer:
 *  - caminhos que nenhum agente lê (chave mestra, banco, login do Claude, .env);
 *  - o ambiente do processo do agente, sem os segredos da Central.
 */

const SENSITIVE_NAMES = [
  /^\.env(\..+)?$/i,
  /^master\.key$/i,
  /^setup-token$/i,
  /^central\.db(-wal|-shm)?$/i,
  /^\.credentials\.json$/i,
  /^id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$/i,
  /^hosts\.ya?ml$/i,
  /\.pem$/i
];

export function sensitiveDirs(dataDir: string): string[] {
  const home = os.homedir();
  return [dataDir, path.join(home, ".claude"), path.join(home, ".ssh"), path.join(home, ".config", "gh"), path.join(home, ".config", "anthropic"), path.join(home, ".aws")];
}

function insideAny(abs: string, dirs: string[]): boolean {
  return dirs.some((d) => abs === d || abs.startsWith(d + path.sep));
}

/** Motivo do bloqueio, ou null se o caminho pode ser tocado. */
export function pathBlocked(candidate: string, cwd: string, dataDir: string, allowDirs: string[] = []): string | null {
  if (!candidate) return null;
  const expanded = candidate.startsWith("~") ? path.join(os.homedir(), candidate.slice(1)) : candidate;
  const abs = path.resolve(cwd, expanded);
  if (insideAny(abs, allowDirs)) return null;
  if (insideAny(abs, sensitiveDirs(dataDir))) return "pasta de segredos";
  const base = path.basename(abs);
  if (base !== ".env.example" && SENSITIVE_NAMES.some((re) => re.test(base))) return "arquivo de segredos";
  return null;
}

const PATH_KEYS = ["file_path", "path", "notebook_path", "pattern", "glob"];

/** Confere a entrada de uma ferramenta antes de ela rodar. */
export function toolInputBlocked(toolName: string, input: unknown, cwd: string, dataDir: string, allowDirs: string[] = []): string | null {
  if (!input || typeof input !== "object") return null;
  const rec = input as Record<string, unknown>;
  for (const key of PATH_KEYS) {
    const v = rec[key];
    if (typeof v === "string") {
      const why = pathBlocked(v, cwd, dataDir, allowDirs);
      if (why) return why;
    }
  }
  if (toolName === "Bash" && typeof rec.command === "string") {
    // Os anexos da conversa ficam dentro da pasta de dados, mas são liberados.
    const cmd = allowDirs.reduce((acc, d) => acc.split(d).join(""), rec.command);
    const dirs = sensitiveDirs(dataDir);
    if (dirs.some((d) => cmd.includes(d))) return "pasta de segredos";
    if (/(^|[\s/'"=])(\.env(\.[\w.-]+)?|master\.key|setup-token|\.credentials\.json)(?=$|[\s'"|;&>)])/.test(cmd) && !/\.env\.example/.test(cmd)) {
      return "arquivo de segredos";
    }
    if (/~\/\.(claude|ssh|aws|central)\b|\$HOME\/\.(claude|ssh|aws|central)\b/.test(cmd)) return "pasta de segredos";
  }
  return null;
}

const ENV_EXACT = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LANGUAGE", "TERM", "TMPDIR", "TZ", "DISPLAY",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy",
  "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR",
  "CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_ANTHROPIC_AWS", "CLAUDE_CONFIG_DIR", "CLOUD_ML_REGION"
]);
const ENV_PREFIX = ["LC_", "XDG_", "ANTHROPIC_", "AWS_", "GOOGLE_", "GIT_CONFIG_"];

/**
 * Ambiente do processo do agente: só o básico do sistema e a autenticação do
 * modelo. Segredos de conector (TWENTY_API_KEY, GITHUB_TOKEN…) e as variáveis
 * CENTRAL_* ficam de fora, então nem um `env` no terminal do agente os mostra.
 */
export function agentEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    if (ENV_EXACT.has(k) || ENV_PREFIX.some((p) => k.startsWith(p))) out[k] = v;
  }
  out.CLAUDE_AGENT_SDK_CLIENT_APP = "central-mbf/0.1.0";
  // Nada em segundo plano nem agendado por fora: subagente e terminal terminam dentro da
  // resposta, onde o Felipe vê e para; rotina é da Central.
  out.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
  out.CLAUDE_CODE_DISABLE_CRON = "1";
  return out;
}
