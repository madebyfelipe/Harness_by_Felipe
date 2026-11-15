import fs from "node:fs/promises";
import path from "node:path";
import { getConversation } from "@/lib/chat";
import { nowIso } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fail, guard, json } from "@/lib/http";
import { uploadsDir } from "@/lib/runner";

const MAX_BYTES = 20 * 1024 * 1024;

function safeName(name: string): string {
  const base = path.basename(name).normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_");
  return (base.replace(/^\.+/, "") || "arquivo").slice(-80);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  if (!(await getConversation(id))) return fail("Conversa não encontrada.", 404);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Envio inválido.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Nenhum arquivo.");
  if (file.size > MAX_BYTES) return fail("Arquivo acima de 20 MB.", 413);
  if (file.size === 0) return fail("Arquivo vazio.");

  const attId = crypto.randomUUID();
  const name = safeName(file.name);
  const abs = path.join(uploadsDir(id), `${attId.slice(0, 8)}-${name}`);
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
  const db = await getDb();
  await db.run("INSERT INTO attachments (id, conversation_id, name, path, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    attId,
    id,
    name,
    abs,
    file.type || null,
    file.size,
    nowIso()
  ]);
  return json({ attachment: { id: attId, name, size: file.size } });
}
