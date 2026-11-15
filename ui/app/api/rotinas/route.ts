import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { getRoutine, listRoutines, normalizeRoutine, routineHistory, runsHere, saveRoutine, upcoming } from "@/lib/routines";
import { fmtBR, opensWindowEarly } from "@/lib/schedule";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { routines, errors } = listRoutines();
  const history = await routineHistory(undefined, 100);
  return json({
    routines: routines.map((r) => {
      const next = upcoming(r, 5);
      return {
        ...r,
        aqui: runsHere(r),
        proximas: next.map(fmtBR),
        abreJanela: r.ativa && next.some(opensWindowEarly),
        ultima: history.find((h) => h.rotina === r.nome) ?? null
      };
    }),
    errors,
    history: history.slice(0, 30)
  });
}

/** Cria ou atualiza (mesmo nome) e faz commit. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const existing = getRoutine(String(body.nome ?? ""));
    const r = normalizeRoutine(body, existing?.file);
    const commit = await saveRoutine(r, g.user.name);
    await audit(g.user.name, existing ? "rotina.editada" : "rotina.criada", r.nome);
    return json({ routine: r, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
