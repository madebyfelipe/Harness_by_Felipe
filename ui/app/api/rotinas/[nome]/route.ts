import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { deleteRoutine, getRoutine, routineHistory, saveRoutine } from "@/lib/routines";

type Ctx = { params: Promise<{ nome: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  const r = getRoutine(nome);
  if (!r) return fail("Rotina não encontrada.", 404);
  return json({ routine: r, history: await routineHistory(nome, 30) });
}

/** Liga/desliga. */
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  const r = getRoutine(nome);
  if (!r) return fail("Rotina não encontrada.", 404);
  const body = await readJson(req);
  if (typeof body.ativa !== "boolean") return fail("Informe ativa: true ou false.");
  const commit = await saveRoutine({ ...r, ativa: body.ativa }, g.user.name);
  await audit(g.user.name, body.ativa ? "rotina.ligada" : "rotina.pausada", nome);
  return json({ ok: true, commit });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { nome } = await ctx.params;
  try {
    const commit = await deleteRoutine(nome, g.user.name);
    await audit(g.user.name, "rotina.removida", nome);
    return json({ ok: true, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível remover.");
  }
}
