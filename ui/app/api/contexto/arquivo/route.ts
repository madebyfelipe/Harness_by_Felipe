import { fail, guard, json } from "@/lib/http";
import { readContextFile } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const f = new URL(req.url).searchParams.get("f") || "";
  const text = readContextFile(f);
  return text === null ? fail("Arquivo não encontrado no contexto.", 404) : json({ file: f, text });
}
