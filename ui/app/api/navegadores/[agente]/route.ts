import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { userAction } from "@/lib/browsers";
import { getAgent } from "@/lib/repo";

/** O Felipe abre, assume, devolve, encerra ou mexe na página (só com o controle assumido). */
export async function POST(req: Request, ctx: { params: Promise<{ agente: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { agente } = await ctx.params;
  const body = await readJson<{ acao?: string; x?: number; y?: number; texto?: string; tecla?: string; url?: string }>(req);
  const acao = String(body.acao ?? "");
  if (acao === "abrir" && !getAgent(agente)?.browser) return fail("Este agente não tem o navegador liberado (Configurações → Agentes).");
  try {
    await userAction(agente, { ...body, acao });
    // Texto digitado pelo Felipe pode ser senha: o registro guarda só a ação.
    if (["abrir", "assumir", "devolver", "encerrar", "navegar"].includes(acao)) await audit(g.user.name, `navegador.${acao}`, `${agente}${body.url ? ` · ${String(body.url).slice(0, 120)}` : ""}`);
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message.split("\n")[0] : "Não deu certo.");
  }
}
