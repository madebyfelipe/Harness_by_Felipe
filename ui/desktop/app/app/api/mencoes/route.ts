import { listConnectors } from "@/lib/connectors";
import { guard, json } from "@/lib/http";
import { listProjects } from "@/lib/projects";
import { listAgents } from "@/lib/repo";

/** O que dá para chamar com @ no chat: projetos, agentes e conectores. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const projects = (await listProjects()).map((p) => ({ kind: "projeto", tag: p.slug, label: p.name, hint: p.description || `${p.conversations} conversas` }));
  const agents = listAgents()
    .filter((a) => !a.paused && a.name !== "triagem")
    .map((a) => ({ kind: "agente", tag: a.name, label: a.name, hint: a.description.replace(/\s+/g, " ").slice(0, 90) }));
  const connectors = listConnectors().connectors.map((c) => ({ kind: "conector", tag: c.nome, label: c.titulo || c.nome, hint: c.uso.replace(/\s+/g, " ").slice(0, 90) }));
  return json({ items: [...projects, ...agents, ...connectors] });
}
