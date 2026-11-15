import { spawn, type ChildProcess } from "node:child_process";
import { baseEnv, checkProvider, claudeBin, codexJs, getProvider } from "./providers";

/*
 * Login de um provedor pela tela, com os CLIs oficiais sem modificação:
 *  - Claude: `claude auth login --claudeai` mostra o link da Anthropic e espera o código
 *    que a página dá depois do login. A Central só repassa o código ao processo (stdin);
 *    não guarda nem registra. As credenciais ficam na pasta da conta, gravadas pelo CLI.
 *  - ChatGPT: `codex login --device-auth` mostra um link e um código de uso único; o
 *    Felipe entra no site da OpenAI e digita o código lá. Nada passa pela Central.
 */

export type LoginView = { status: "aguardando-link" | "aguardando-codigo" | "aguardando-site" | "conferindo" | "pronto" | "falhou"; url?: string; code?: string; message?: string };

type Session = LoginView & { proc: ChildProcess; out: string; timer: NodeJS.Timeout };

const g = globalThis as unknown as { __centralLogins?: Map<string, Session> };
const sessions = (g.__centralLogins ??= new Map<string, Session>());

const TIMEOUT_MS = 15 * 60_000;
const clean = (s: string) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

export function loginState(id: string): LoginView | null {
  const s = sessions.get(id);
  return s ? { status: s.status, url: s.url, code: s.code, message: s.message } : null;
}

export function cancelLogin(id: string): void {
  const s = sessions.get(id);
  if (!s) return;
  clearTimeout(s.timer);
  if (s.proc.exitCode === null) s.proc.kill();
  sessions.delete(id);
}

export async function startLogin(id: string): Promise<LoginView> {
  const p = await getProvider(id);
  if (!p) throw new Error("Provedor não encontrado.");
  if (p.kind === "claude-api") throw new Error("Chave de API não tem login: troque a chave removendo e adicionando de novo.");
  cancelLogin(id);

  let proc: ChildProcess;
  if (p.kind === "codex") {
    const js = codexJs();
    if (!js) throw new Error("Codex CLI não instalado nesta máquina.");
    proc = spawn(process.execPath, [js, "login", "--device-auth"], { env: { ...baseEnv(), CODEX_HOME: p.home! } as unknown as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
  } else {
    proc = spawn(claudeBin(), ["auth", "login", "--claudeai"], {
      env: { ...baseEnv(), BROWSER: "false", ...(p.home ? { CLAUDE_CONFIG_DIR: p.home } : {}) } as unknown as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"]
    });
  }

  const s: Session = {
    status: "aguardando-link",
    proc,
    out: "",
    timer: setTimeout(() => {
      s.status = "falhou";
      s.message = "O login expirou (15 min). Comece de novo.";
      if (proc.exitCode === null) proc.kill();
    }, TIMEOUT_MS)
  };
  s.timer.unref?.();
  sessions.set(id, s);

  const onData = (buf: Buffer) => {
    s.out = (s.out + clean(buf.toString("utf8"))).slice(-8000);
    if (!s.url) {
      const m = p.kind === "codex" ? /https:\/\/auth\.openai\.com\/\S+/.exec(s.out) : /https:\/\/\S*oauth\S+/.exec(s.out);
      if (m) s.url = m[0];
    }
    if (p.kind === "codex" && !s.code) {
      const c = /\b[A-Z0-9]{4}-[A-Z0-9]{4,5}\b/.exec(s.out.slice(s.out.indexOf("one-time code")));
      if (c && s.out.includes("one-time code")) s.code = c[0];
    }
    if (s.status === "aguardando-link" && s.url && (p.kind !== "codex" || s.code)) s.status = p.kind === "codex" ? "aguardando-site" : "aguardando-codigo";
  };
  proc.stdout?.on("data", onData);
  proc.stderr?.on("data", onData);
  proc.on("exit", (code) => {
    clearTimeout(s.timer);
    if (s.status === "falhou") return;
    s.status = "conferindo";
    void checkProvider(id)
      .then((info) => {
        s.status = info.loggedIn ? "pronto" : "falhou";
        s.message = info.loggedIn ? [info.email, info.plan].filter(Boolean).join(" · ") || "conectado" : lastLine(s.out) || `O login terminou sem conectar (código ${code}).`;
      })
      .catch((e) => {
        s.status = "falhou";
        s.message = e instanceof Error ? e.message : "erro ao conferir";
      });
  });
  proc.on("error", (e) => {
    s.status = "falhou";
    s.message = `Não consegui abrir o login: ${e.message}`;
  });

  // Espera o link aparecer (até 20 s) para a tela já mostrar.
  for (let i = 0; i < 40 && s.status === "aguardando-link" && proc.exitCode === null; i++) await new Promise((r) => setTimeout(r, 500));
  return loginState(id)!;
}

/** Código que a página da Anthropic mostra depois do login (só Claude). */
export function submitCode(id: string, code: string): LoginView {
  const s = sessions.get(id);
  if (!s || s.status !== "aguardando-codigo") throw new Error("Não há login esperando código. Comece de novo.");
  const value = code.trim();
  if (!value || value.length > 400 || /\s/.test(value)) throw new Error("Código inválido: cole exatamente o que a página mostrou.");
  s.proc.stdin?.write(value + "\n");
  s.status = "conferindo";
  return loginState(id)!;
}

function lastLine(out: string): string {
  return (
    out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/https?:\/\//.test(l) && !/WARNING/.test(l))
      .slice(-1)[0]
      ?.slice(0, 200) ?? ""
  );
}
