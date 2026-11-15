import { getDb } from "./db";
import { nowIso } from "./config";
import { addMessage } from "./chat";

/*
 * Limpeza de arranque. Quando o servidor cai ou é reiniciado no meio de uma conversa, a
 * execução fica gravada como "rodando" para sempre: o chat mostra o indicador girando e o
 * próximo pedido naquela conversa esbarra na execução antiga. Aqui, uma vez por processo,
 * fechamos essas execuções e os cartões de aprovação que ficaram sem resposta.
 */
export async function sweepStaleRuns(): Promise<number> {
  try {
    const db = await getDb();
    const pendentes = await db.all<{ id: string; conversation_id: string; agent: string | null }>(
      "SELECT id, conversation_id, agent FROM runs WHERE status = 'running' AND ended_at IS NULL"
    );
    if (!pendentes.length) {
      await db.run("UPDATE approvals SET status = 'expired', decided_at = ? WHERE status = 'pending'", [nowIso()]);
      return 0;
    }
    const fim = nowIso();
    await db.run("UPDATE approvals SET status = 'expired', decided_at = ? WHERE status = 'pending'", [fim]);
    for (const r of pendentes) {
      await db.run("UPDATE runs SET status = 'error', error = ?, ended_at = ? WHERE id = ?", [
        "Interrompida: o servidor reiniciou no meio da execução.",
        fim,
        r.id
      ]);
      await addMessage({
        conversationId: r.conversation_id,
        runId: r.id,
        role: "assistant",
        content: "Parei no meio: o servidor reiniciou durante esta execução. Manda o pedido de novo que eu retomo.",
        meta: { interrupted: true }
      }).catch(() => undefined);
    }
    console.log(`[central] ${pendentes.length} execução(ões) interrompida(s) fechada(s) no arranque`);
    return pendentes.length;
  } catch (e) {
    console.error("[central] limpeza de arranque:", e instanceof Error ? e.message : e);
    return 0;
  }
}
