import os from "node:os";
import path from "node:path";
import { browserAutoOn } from "./autoapprove-setting";

/*
 * Modo automático de aprovação: classifica cada chamada de ferramenta em "seguro"
 * (roda sem perguntar) ou "perguntar" (cartão no chat, como sempre). É por regra, sem
 * modelo: previsível, sem custo e sem como um texto lido convencer o classificador.
 * Na dúvida, pergunta. O que os bloqueios da Central negam (arquivos de segredo etc.)
 * é negado antes de chegar aqui.
 *
 * Seguro = só lê, ou muda algo local e reversível pelo git dentro do repositório.
 * Sempre pergunta = apaga, envia para fora, publica, gasta, instala, mexe em permissões,
 * ou altera o que dá poder aos agentes (agents/, skills/, routines/, connectors/, ui/).
 */

export type Verdict = { auto: boolean; why: string };
const ask = (why: string): Verdict => ({ auto: false, why });
const ok = (why: string): Verdict => ({ auto: true, why });

/** Pastas do repositório que definem o que os agentes podem fazer: mudança sempre passa pelo Felipe. */
const POWER_DIRS = ["ui", "agents", "skills", "routines", "connectors", ".git", ".github", ".claude"];

function insideRepo(file: string, cwd: string): string | null {
  if (!file || file.includes("\0")) return null;
  const abs = path.resolve(cwd, file);
  if (abs !== cwd && !abs.startsWith(cwd + path.sep)) return null;
  return path.relative(cwd, abs);
}

/** Onde a regra vale: na VPS o agente trabalha na máquina toda (Felipe, 15/11), menos as pastas de sistema. */
export type Scope = { vps?: boolean };

/** Pastas de sistema: mesmo na VPS, mexer nelas passa pelo Felipe. As de segredo já são negadas antes. */
const SYSTEM_DIRS = ["/etc", "/usr", "/bin", "/sbin", "/lib", "/lib32", "/lib64", "/boot", "/proc", "/sys", "/dev", "/root", "/var/lib", "/var/spool", "/snap", "/opt"];

function absOf(file: string, cwd: string): string {
  return path.resolve(cwd, file.startsWith("~") ? path.join(os.homedir(), file.slice(1)) : file);
}

/**
 * Caminho dentro da área de trabalho: relativo ao repositório, ou (na VPS) absoluto fora
 * dele e fora do sistema. null = fora da área (pergunta).
 */
function insideWork(file: string, cwd: string, scope: Scope): string | null {
  const rel = insideRepo(file, cwd);
  if (rel !== null || !scope.vps || !file || file.includes("\0")) return rel;
  const abs = absOf(file, cwd);
  if (abs === "/" || SYSTEM_DIRS.some((d) => abs === d || abs.startsWith(d + path.sep))) return null;
  return abs;
}

/** Comandos que sobem ou consultam servidor: na VPS rodam sem cartão (o Felipe quer servidor rodando lá). */
function vpsServerVerdict(cmd: string, args: string[], cwd: string, scope: Scope): Verdict | null {
  if (cmd === "nohup" || cmd === "setsid") {
    const rest = args.filter((a, i) => !(i === 0 && /^-[a-z]+$/.test(a)));
    return rest.length ? segmentVerdict(rest.join(" "), cwd, scope) : ask(`${cmd} sem comando`);
  }
  if (["ps", "pgrep", "ss", "lsof", "free", "uptime", "id", "whoami", "env", "printenv", "nproc", "uname"].includes(cmd)) return cmd === "env" || cmd === "printenv" ? ask("mostra variáveis de ambiente") : ok("só leitura da VPS");
  if (cmd === "node") return args[0] && !args.some((a) => /^(-e|--eval|-p|--print)$/.test(a)) ? ok("roda script ou servidor na VPS") : ask("node com código na linha de comando");
  if (cmd === "npm" || cmd === "pnpm" || cmd === "yarn") return ["start", "run", "dev", "test"].includes(args[0] ?? "") ? ok("roda script do projeto (servidor)") : null;
  if (cmd === "npx") return ["next", "vite", "tsx", "serve", "astro", "tsc"].includes(args[0] ?? "") ? ok("ferramenta do projeto (servidor ou build)") : null;
  if ((cmd === "python3" || cmd === "python") && args[0] === "-m" && args[1] === "http.server") return ok("servidor de arquivos local");
  if (cmd === "curl") {
    const urls = args.filter((a) => /^https?:\/\//.test(a));
    const local = urls.length > 0 && urls.every((u) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(u));
    const write = args.some((a) => /^(-X|--request|-d|--data.*|-F|--form|-T|--upload-file|-o|--output)$/.test(a));
    return local && !write ? ok("consulta servidor local") : null;
  }
  return null;
}

const READ_ONLY = new Set(["ls", "cat", "head", "tail", "wc", "grep", "egrep", "fgrep", "rg", "sort", "uniq", "cut", "tr", "echo", "printf", "pwd", "date", "which", "file", "stat", "du", "df", "tree", "basename", "dirname", "realpath", "diff", "jq", "true", "false", "test", "cd", "nl", "column"]);
const GIT_SAFE = new Set(["status", "log", "diff", "show", "rev-parse", "ls-files", "blame", "fetch", "add", "commit", "shortlog", "describe"]);
const NPM_RUN_SAFE = new Set(["test", "lint", "typecheck", "build", "check"]);

function segmentVerdict(seg: string, cwd: string, scope: Scope = {}): Verdict {
  const tokens = seg.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return ok("vazio");
  const cmd = tokens[0];
  if (/=/.test(cmd)) return ask("define variável de ambiente");
  const args = tokens.slice(1);
  // Caminho absoluto, pasta do usuário ou subir de pasta: só dentro do repositório.
  for (const raw of args) {
    const a = raw.replace(/^["']|["']$/g, "");
    if (a.startsWith("-") || a === "/dev/null") continue;
    if (scope.vps) {
      if ((a.startsWith("/") || a.startsWith("~") || a.includes("..")) && insideWork(a, cwd, scope) === null) return ask("mexe em pasta do sistema");
      continue;
    }
    if (a.startsWith("~") || a.includes("..")) return ask("caminho fora do repositório");
    if (a.startsWith("/") && insideRepo(a, cwd) === null) return ask("caminho fora do repositório");
  }
  if (scope.vps) {
    const v = vpsServerVerdict(cmd, args, cwd, scope);
    if (v) return v;
  }
  if (READ_ONLY.has(cmd)) return ok("só leitura");
  if (cmd === "find") return args.some((a) => /^-(delete|exec|execdir|ok|okdir|fprint|fls)/.test(a)) ? ask("find que executa ou apaga") : ok("só leitura");
  if (cmd === "sed") return args.includes("-n") && !args.some((a) => /^-[a-zA-Z]*i/.test(a) || a === "--in-place") ? ok("só leitura") : ask("sed que altera arquivo");
  if (cmd === "mkdir" || cmd === "touch") return ok("cria pasta ou arquivo vazio no repositório");
  if (cmd === "git") {
    const sub = args.find((a) => !a.startsWith("-")) ?? "";
    if (sub === "branch") return args.some((a) => /^-[dDmM]|^--delete|^--move/.test(a)) ? ask("git branch que apaga ou renomeia") : ok("git local");
    if (sub === "remote") return args.length <= 2 && (args[1] ?? "-v") === "-v" ? ok("git local") : ask("git remote que altera");
    if (sub === "stash") return args[1] === "list" ? ok("git local") : ask("git stash");
    return GIT_SAFE.has(sub) ? ok("git local e reversível") : ask(`git ${sub || "?"} muda histórico ou envia`);
  }
  if (cmd === "npm" || cmd === "pnpm" || cmd === "yarn") {
    if (args[0] === "test") return ok("testes");
    if (args[0] === "run" && NPM_RUN_SAFE.has(args[1] ?? "")) return ok("script de checagem");
    return ask("gerenciador de pacotes (instala ou roda script)");
  }
  if (cmd === "npx") return args[0] === "tsc" ? ok("checagem de tipos") : ask("npx roda código baixado");
  return ask(`comando "${cmd}" não está na lista de seguros`);
}

export function classifyBash(command: string, cwd: string, scope: Scope = {}): Verdict {
  const c = command.trim();
  if (!c) return ask("comando vazio");
  if (c.length > 1500) return ask("comando longo demais para classificar");
  if (/[\n\r]/.test(c)) return ask("várias linhas");
  if (/`|\$\(|<\(|>\(|\$\{/.test(c)) return ask("substituição de comando");
  // Na VPS, servidor em segundo plano é o normal (nohup … &); fora dela, pergunta.
  if (!scope.vps && /(^|[^&])&($|[^&>])/.test(c.replace(/2>&1/g, ""))) return ask("roda em segundo plano");
  // Redirecionamento: só para /dev/null (e 2>&1); na VPS, também para arquivo de log fora do sistema.
  let semSeguro = c.replace(/\d?>>?\s*\/dev\/null/g, " ").replace(/2>&1/g, " ");
  if (scope.vps) {
    for (const m of semSeguro.matchAll(/\d?>>?\s*([^\s;|&<>]+)/g)) if (insideWork(m[1].replace(/^["']|["']$/g, ""), cwd, scope) === null) return ask("redireciona para pasta do sistema");
    semSeguro = semSeguro.replace(/\d?>>?\s*[^\s;|&<>]+/g, " ");
  }
  if (/[<>]/.test(semSeguro.replace(/"[^"]*"|'[^']*'/g, ""))) return ask("redireciona para arquivo");
  const semAspas = semSeguro.replace(/"[^"]*"|'[^']*'/g, (m) => m.replace(/[;|&]/g, "_"));
  for (const seg of semAspas.split(/&&|\|\||;|\||&/)) {
    const v = segmentVerdict(seg, cwd, scope);
    if (!v.auto) return v;
  }
  return ok("leitura ou mudança local reversível");
}

const MCP_READ = /^(get|list|search|find|read|fetch|query|describe|learn|whoami|view|show|count|lookup|check)(_|-|[A-Z]|$)/;

export async function classifyTool(name: string, input: unknown, cwd: string, scope: Scope = {}): Promise<Verdict> {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (name === "Bash") return classifyBash(String(i.command ?? ""), cwd, scope);
  if (name === "Edit" || name === "Write" || name === "NotebookEdit") {
    const rel = insideWork(String(i.file_path ?? i.notebook_path ?? ""), cwd, scope);
    if (rel === null) return ask(scope.vps ? "arquivo em pasta do sistema" : "arquivo fora do repositório");
    if (path.isAbsolute(rel)) return /(^|\/)\.env|\.key$|\.pem$|credentials|secret/i.test(rel) ? ask("arquivo com cara de segredo") : ok("arquivo da VPS fora do repositório");
    if (!rel) return ask("sem arquivo");
    const first = rel.split(path.sep)[0];
    if (POWER_DIRS.includes(first)) return ask(`mexe em ${first}/, que define o que os agentes podem fazer`);
    if (/(^|\/)\.env|\.key$|\.pem$|credentials|secret/i.test(rel)) return ask("arquivo com cara de segredo");
    return ok("arquivo do repositório (reversível pelo git)");
  }
  const m = /^mcp__(.+?)__(.+)$/.exec(name);
  if (m) {
    if (m[1] === "central") {
      if (/^navegador_(abrir|ler|captura|fechar|rolar|esperar)$/.test(m[2])) return ok("navegador: só abre, lê ou espera");
      if (/^navegador_/.test(m[2])) {
        if (await browserAutoOn()) return ok("navegador em modo sozinho (o Felipe ligou); fica registrado");
        return ask("ação num site (pode enviar formulário, comprar ou publicar)");
      }
      return ask("cria configuração da Central");
    }
    return MCP_READ.test(m[2]) ? ok("consulta em app conectado") : ask("ação em app conectado (pode criar, enviar ou apagar)");
  }
  return ask("ferramenta sem regra de segurança");
}
