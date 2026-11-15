import { execFile } from "node:child_process";
import { audit } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";
import { baseEnv, checkProvider, claudeBin, getProvider, MACHINE_ID, runCodexCli } from "@/lib/providers";

/** Sai da conta pelo CLI oficial. A conta da máquina não sai por aqui (é o login do Claude Code desta máquina). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const p = await getProvider(id);
  if (!p) return fail("Provedor não encontrado.", 404);
  if (id === MACHINE_ID) return fail("A conta da máquina é o login do Claude Code deste servidor; saia dela pelo terminal, se quiser.");
  if (p.kind === "codex") await runCodexCli(p.home!, ["logout"]);
  else if (p.kind === "claude") {
    await new Promise<void>((resolve) =>
      execFile(claudeBin(), ["auth", "logout"], { env: { ...baseEnv(), CLAUDE_CONFIG_DIR: p.home! } as unknown as NodeJS.ProcessEnv, timeout: 30_000 }, () => resolve())
    );
  } else return fail("Chave de API não tem login; remova o provedor para tirar a chave.");
  await audit(g.user.name, "provedores.sair", id);
  return json({ info: await checkProvider(id) });
}
