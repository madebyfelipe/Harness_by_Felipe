import { createConversation, listConversations } from "@/lib/chat";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { DEFAULT_CONTEXT_MODEL, isKnownModel } from "@/lib/models";
import { getAgent, ORCHESTRATOR } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const mode = new URL(req.url).searchParams.get("mode") === "contexto" ? "contexto" : "chat";
  return json({ conversations: await listConversations(mode) });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const mode = body.mode === "contexto" ? "contexto" : "chat";
  const wanted = str(body.model, 60);
  if (mode === "contexto") {
    return json({ conversation: await createConversation({ mode, agent: "contexto", model: isKnownModel(wanted) ? wanted : DEFAULT_CONTEXT_MODEL }) });
  }
  const agent = getAgent(str(body.agent, 60) || ORCHESTRATOR);
  if (!agent) return fail("Agente não encontrado em agents/.", 404);
  return json({ conversation: await createConversation({ mode, agent: agent.name, model: isKnownModel(wanted) ? wanted : agent.model }) });
}
