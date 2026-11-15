import fs from "node:fs/promises";
import { getDb } from "@/lib/db";
import { fail, guard } from "@/lib/http";

/** Serve um anexo da conversa (imagens no chat e no visualizador). Só com sessão. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; att: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id, att } = await ctx.params;
  const row = await (await getDb()).get<{ name: string; path: string; mime: string | null }>("SELECT name, path, mime FROM attachments WHERE id = ? AND conversation_id = ?", [att, id]);
  if (!row) return fail("Anexo não encontrado.", 404);
  try {
    const buf = await fs.readFile(row.path);
    const download = new URL(req.url).searchParams.has("baixar");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": row.mime || "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(row.name)}"`
      }
    });
  } catch {
    return fail("Arquivo do anexo sumiu.", 404);
  }
}
