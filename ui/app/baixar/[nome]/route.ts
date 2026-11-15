import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { cfg } from "@/lib/config";

/*
 * Downloads públicos de builds (app desktop). Os arquivos ficam em
 * <pasta de dados>/downloads, fora do repositório, e só saem por aqui:
 * nome simples, sem subpasta, sem listagem. O proxy libera /baixar.
 */

type Ctx = { params: Promise<{ nome: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const nome = (await ctx.params).nome ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(nome) || nome.includes("..")) {
    return new Response("Nome inválido.", { status: 400 });
  }
  const arquivo = path.join(cfg().dataDir, "downloads", nome);
  let st: fs.Stats;
  try {
    st = fs.statSync(arquivo);
  } catch {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }
  if (!st.isFile()) return new Response("Arquivo não encontrado.", { status: 404 });
  const stream = Readable.toWeb(fs.createReadStream(arquivo)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(st.size),
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
