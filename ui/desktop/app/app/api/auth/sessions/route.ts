import { audit, getDb } from "@/lib/db";
import { guard, json } from "@/lib/http";

/** Encerra todas as outras sessões (celular perdido, computador emprestado). */
export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const db = await getDb();
  const r = await db.run("DELETE FROM sessions WHERE user_id = ? AND id_hash <> ?", [g.user.id, g.user.sessionHash]);
  await audit(g.user.name, "sessoes.encerradas", String(r.changes));
  return json({ ok: true, removed: r.changes });
}
