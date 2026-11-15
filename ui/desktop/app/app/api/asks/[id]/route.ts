import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { answerAsk } from "@/lib/runner";

/** Resposta do Felipe a um cartão de pergunta ou de pedido de acesso de um agente. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const body = await readJson<{ ok?: boolean; value?: string }>(req);
  try {
    const r = await answerAsk(id, { ok: body.ok !== false, value: typeof body.value === "string" ? body.value.slice(0, 8000) : "" });
    if (r === "gone") return fail("Este pedido já foi respondido ou expirou.", 410);
    await audit(g.user.name, body.ok === false ? "pedido.dispensado" : "pedido.respondido", id);
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível guardar.");
  }
}
