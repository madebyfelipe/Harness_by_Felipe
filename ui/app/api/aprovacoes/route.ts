import { guard, json } from "@/lib/http";
import { getDb } from "@/lib/db";

/*
 * Fila única de aprovações: tudo o que está esperando o Felipe, de qualquer
 * conversa, num lugar só. A decisão continua sendo a rota /api/approvals/[id],
 * que fala com a execução viva; aqui é só leitura.
 */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const db = await getDb();
  const rows = await db.all<{ id: string; conversation_id: string; run_id: string; agent: string; tool: string; input: string; created_at: string; conversa: string | null }>(
    `SELECT a.id, a.conversation_id, a.run_id, a.agent, a.tool, a.input, a.created_at,
            (SELECT c.title FROM conversations c WHERE c.id = a.conversation_id) AS conversa
       FROM approvals a
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
      LIMIT 100`
  );
  return json({ pending: rows });
}
