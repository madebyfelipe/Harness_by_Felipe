import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { normalizeAgent, openbotCandidates, PROTECTED, saveAgent } from "@/lib/agents-store";
import { allowedFor, listConnectors } from "@/lib/connectors";
import { MODELS } from "@/lib/models";
import { listAgents } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { connectors } = listConnectors();
  return json({
    agents: listAgents().map((a) => ({
      name: a.name,
      description: a.description,
      model: MODELS.find((m) => m.id === a.model)?.alias ?? "sonnet",
      tools: a.tools,
      prompt: a.prompt,
      paused: a.paused,
      browser: a.browser,
      file: a.file,
      protected: PROTECTED.includes(a.name),
      apps: connectors.filter((c) => allowedFor(c, a.name)).map((c) => c.titulo)
    })),
    models: MODELS.map((m) => ({ alias: m.alias, label: m.label, note: m.note })),
    importaveis: openbotCandidates().filter((c) => !c.exists).map((c) => c.name)
  });
}

/** Cria (novo: true) ou edita, e faz commit. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const a = normalizeAgent(body);
    const commit = await saveAgent(a, g.user.name, body.novo === true);
    await audit(g.user.name, body.novo === true ? "agente.criado" : "agente.editado", a.name);
    return json({ agent: a, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
