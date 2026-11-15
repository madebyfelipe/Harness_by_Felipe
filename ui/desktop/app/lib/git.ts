import { execFile } from "node:child_process";
import { cfg } from "./config";

type GitResult = { stdout: string; stderr: string; code: number };

function git(args: string[], timeoutMs = 30_000): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile(
      "git",
      ["-C", cfg().repoDir, ...args],
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } },
      (err, stdout, stderr) => {
        const code = err ? (typeof (err as { code?: unknown }).code === "number" ? ((err as { code: number }).code) : 1) : 0;
        resolve({ stdout: String(stdout).trim(), stderr: String(stderr).trim(), code });
      }
    );
  });
}

export type CommitResult = { committed: boolean; commit?: string; pushed: boolean; note?: string };

// Um commit por vez: dois salvamentos simultâneos não disputam o index do git.
let queue: Promise<unknown> = Promise.resolve();

/** Faz commit só dos caminhos dados (relativos ao repo) e, se ligado, envia. */
export function commitPaths(paths: string[], message: string): Promise<CommitResult> {
  const job = queue.then(() => doCommit(paths, message));
  queue = job.catch(() => undefined);
  return job;
}

async function doCommit(paths: string[], message: string): Promise<CommitResult> {
  const add = await git(["add", "--", ...paths]);
  if (add.code !== 0) return { committed: false, pushed: false, note: add.stderr || "git add falhou" };
  const staged = await git(["diff", "--cached", "--quiet", "--", ...paths]);
  if (staged.code === 0) return { committed: false, pushed: false, note: "nada mudou" };

  const identity: string[] = [];
  if ((await git(["config", "user.name"])).code !== 0) identity.push("-c", "user.name=Central");
  if ((await git(["config", "user.email"])).code !== 0) identity.push("-c", "user.email=central@localhost");
  const commit = await git([...identity, "commit", "-m", message, "--", ...paths]);
  if (commit.code !== 0) return { committed: false, pushed: false, note: commit.stderr || commit.stdout || "git commit falhou" };
  const hash = (await git(["rev-parse", "--short", "HEAD"])).stdout;

  if (!cfg().gitPush) return { committed: true, commit: hash, pushed: false, note: "envio desligado (CENTRAL_GIT_PUSH)" };
  let push = await git(["push"], 60_000);
  if (push.code !== 0) {
    // Outra instância (VPS ou local) enviou antes: traz o que ela fez e tenta de novo.
    const pull = await git(["pull", "--rebase", "--autostash"], 60_000);
    if (pull.code === 0) push = await git(["push"], 60_000);
  }
  return push.code === 0
    ? { committed: true, commit: hash, pushed: true }
    : { committed: true, commit: hash, pushed: false, note: (push.stderr || "git push falhou").split("\n").slice(-2).join(" ") };
}

export async function repoStatus(): Promise<{ branch: string; commit: string; subject: string; dirty: number; when: string }> {
  const [branch, head, dirty] = await Promise.all([
    git(["rev-parse", "--abbrev-ref", "HEAD"]),
    git(["log", "-1", "--format=%h%x09%s%x09%cI"]),
    git(["status", "--porcelain"])
  ]);
  const [commit = "", subject = "", when = ""] = head.stdout.split("\t");
  return { branch: branch.stdout, commit, subject, when, dirty: dirty.stdout ? dirty.stdout.split("\n").length : 0 };
}

/** Traz a configuração que a outra instância publicou (só avanço rápido). */
export async function pullConfig(): Promise<{ ok: boolean; note: string }> {
  const r = await git(["pull", "--ff-only"], 60_000);
  return { ok: r.code === 0, note: (r.code === 0 ? r.stdout : r.stderr).split("\n").slice(-1)[0] || "" };
}
