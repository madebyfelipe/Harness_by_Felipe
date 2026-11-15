import { createConversation, listConversationPreviews, listConversations } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { DEFAULT_CONTEXT_MODEL, isKnownModel } from "@/lib/models";
import { getProject } from "@/lib/projects";
import { getAgent } from "@/lib/repo";
import { activeRun } from "@/lib/runner";
import { AUTO_AGENT, TRIAGE_MODEL } from "@/lib/triage";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const params = new URL(req.url).searchParams;
  if (params.has("q") || params.get("view") === "lista") {
    const list = await listConversationPreviews(80, str(params.get("q"), 80).trim(), str(params.get("projeto"), 60));
    return json({ conversations: list.map((c) => ({ ...c, running: activeRun(c.id)?.status === "running" })) });
  }
  const mode = params.get("mode") === "contexto" ? "contexto" : "chat";
  return json({ conversations: await listConversations(mode) });
}

/** Sem agente = conversa "auto": a triagem decide agente e modelo a cada pedido. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const mode = body.mode === "contexto" ? "contexto" : "chat";
  const wanted = str(body.model, 60);
  const projectId = str(body.projectId, 60) ? (await getProject(str(body.projectId, 60)))?.id ?? null : null;
  if (mode === "contexto") {
    return json({ conversation: await createConversation({ mode, agent: "contexto", model: isKnownModel(wanted) ? wanted : DEFAULT_CONTEXT_MODEL, projectId }) });
  }
  const name = str(body.agent, 60);
  if (!name || name === AUTO_AGENT) return json({ conversation: await createConversation({ mode, agent: AUTO_AGENT, model: TRIAGE_MODEL, projectId }) });
  const agent = getAgent(name);
  if (!agent) return fail("Agente não encontrado em agents/.", 404);
  return json({ conversation: await createConversation({ mode, agent: agent.name, model: isKnownModel(wanted) ? wanted : agent.model, projectId }) });
}
