import { guard, json } from "@/lib/http";
import { getDb } from "@/lib/db";

/*
 * Registros: execuções, decisões de aprovação e auditoria. É a tela que
 * responde "o que rodou, com qual modelo, quanto custou e quem aprovou".
 */
type Run = {
  id: string;
  conversation_id: string | null;
  conversa: string | null;
  agent: string;
  model: string;
  origin: string;
  status: string;
  input: string;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  num_turns: number | null;
  duration_ms: number | null;
  started_at: string;
  ended_at: string | null;
  error: string | null;
};

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const db = await getDb();
  const limite = Math.min(200, Math.max(20, Number(new URL(req.url).searchParams.get("limite") || 60)));
  const runs = await db.all<Run>(
    `SELECT r.id, r.conversation_id, r.agent, r.model, r.origin, r.status, r.input, r.cost_usd, r.input_tokens, r.output_tokens,
            r.num_turns, r.duration_ms, r.started_at, r.ended_at, r.error,
            (SELECT c.title FROM conversations c WHERE c.id = r.conversation_id) AS conversa
       FROM runs r ORDER BY r.started_at DESC LIMIT ?`,
    [limite]
  );
  const aprovacoes = await db.all<{ id: string; conversation_id: string; agent: string; tool: string; input: string; status: string; created_at: string; decided_at: string | null; conversa: string | null }>(
    `SELECT a.id, a.conversation_id, a.agent, a.tool, a.input, a.status, a.created_at, a.decided_at,
            (SELECT c.title FROM conversations c WHERE c.id = a.conversation_id) AS conversa
       FROM approvals a ORDER BY a.created_at DESC LIMIT ?`,
    [limite]
  );
  const auditoria = await db.all<{ id: string; created_at: string; actor: string; action: string; detail: string | null }>(
    "SELECT id, created_at, actor, action, detail FROM audit ORDER BY created_at DESC LIMIT ?",
    [limite]
  );
  return json({ runs, aprovacoes, auditoria });
}
