import { fail, guard, json, readJson, str } from "@/lib/http";
import { fmtBR, nextRuns, opensWindowEarly, parseQuando } from "@/lib/schedule";

/** "dias úteis às 05:30" → cron e as próximas 5 execuções em Brasília. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  try {
    const { cron, texto } = parseQuando(str((await readJson(req)).quando, 120));
    const next = nextRuns(cron, 5);
    return json({ cron, texto, proximas: next.map(fmtBR), abreJanela: next.some(opensWindowEarly) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não entendi.");
  }
}
