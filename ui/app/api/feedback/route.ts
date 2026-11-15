import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { writeNotes } from "@/lib/notes";

/** Botão de feedback (toda tela e cada entrega): grava em feedback.md e faz commit. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const sentimento = body.sentimento === "bom" || body.sentimento === "ruim" ? body.sentimento : "ideia";
  const texto = str(body.texto, 2000).trim();
  const onde = str(body.onde, 200).trim() || "Central";
  if (sentimento === "ideia" && !texto) return fail("Escreva o comentário.");
  try {
    const { commit } = await writeNotes([{ kind: "feedback", texto: texto || (sentimento === "bom" ? "bom" : "ruim"), sentimento, onde }], g.user.name);
    await audit(g.user.name, "feedback", `${sentimento} · ${onde}`);
    return json({ ok: true, commit: commit?.commit ?? null });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não consegui gravar.", 500);
  }
}
