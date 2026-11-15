import { audit } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";
import { importOpenbot } from "@/lib/agents-store";

/** Cria como rascunho pausado os agentes do OpenBot que ainda não existem em agents/. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  try {
    const r = await importOpenbot(g.user.name);
    await audit(g.user.name, "agente.importados", r.created.join(", ") || "nenhum");
    return json(r);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível importar.");
  }
}
