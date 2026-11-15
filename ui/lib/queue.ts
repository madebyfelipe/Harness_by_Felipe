import { getConversation } from "./chat";
import { nowIso } from "./config";
import { getDb } from "./db";
import { activeRun, startRun } from "./runner";

/*
 * Mensagens pendentes de uma conversa. Sem run_at = "na fila": sai assim que a execução
 * atual terminar. Com run_at = agendada: o agendador (30 s) manda na hora. Uma por vez,
 * na ordem; se a conversa estiver rodando, espera a próxima chance.
 */

export type Queued = { id: string; conversation_id: string; text: string; run_at: string | null; status: string; error: string | null; created_at: string };

export async function listQueued(conversationId: string): Promise<Queued[]> {
  const db = await getDb();
  return db.all<Queued>("SELECT * FROM queued_messages WHERE conversation_id = ? AND status = 'pendente' ORDER BY COALESCE(run_at, created_at), created_at", [conversationId]);
}

export async function enqueue(conversationId: string, text: string, runAt?: string | null): Promise<Queued> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.run("INSERT INTO queued_messages (id, conversation_id, text, run_at, status, created_at) VALUES (?, ?, ?, ?, 'pendente', ?)", [id, conversationId, text.slice(0, 40_000), runAt ?? null, nowIso()]);
  if (!runAt) void dispatch(conversationId);
  return (await db.get<Queued>("SELECT * FROM queued_messages WHERE id = ?", [id]))!;
}

export async function cancelQueued(conversationId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE queued_messages SET status = 'cancelada' WHERE id = ? AND conversation_id = ? AND status = 'pendente'", [id, conversationId]);
}

const busy = new Set<string>();

/** Manda a próxima pendente desta conversa, se ela estiver livre. */
export async function dispatch(conversationId: string): Promise<boolean> {
  if (busy.has(conversationId) || activeRun(conversationId)?.status === "running") return false;
  busy.add(conversationId);
  try {
    const db = await getDb();
    const next = await db.get<Queued>(
      "SELECT * FROM queued_messages WHERE conversation_id = ? AND status = 'pendente' AND (run_at IS NULL OR run_at <= ?) ORDER BY COALESCE(run_at, created_at), created_at LIMIT 1",
      [conversationId, nowIso()]
    );
    if (!next) return false;
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      await db.run("UPDATE queued_messages SET status = 'erro', error = 'conversa apagada' WHERE id = ?", [next.id]);
      return false;
    }
    try {
      await startRun({ conversation, text: next.text });
      await db.run("UPDATE queued_messages SET status = 'enviada', sent_at = ? WHERE id = ?", [nowIso(), next.id]);
      return true;
    } catch (e) {
      // Limite de execuções paralelas: tenta de novo no próximo ciclo do agendador.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/execuç(ão|ões)/i.test(msg)) await db.run("UPDATE queued_messages SET status = 'erro', error = ? WHERE id = ?", [msg.slice(0, 300), next.id]);
      return false;
    }
  } finally {
    busy.delete(conversationId);
  }
}

/** Agendador: conversas com pendente vencida (ou na fila esperando vaga). */
export async function dispatchDue(): Promise<void> {
  const db = await getDb();
  const rows = await db.all<{ conversation_id: string }>("SELECT DISTINCT conversation_id FROM queued_messages WHERE status = 'pendente' AND (run_at IS NULL OR run_at <= ?)", [nowIso()]);
  for (const r of rows) await dispatch(r.conversation_id);
}
