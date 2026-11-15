import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";
import { normalizeSkill, saveSkill } from "@/lib/agents-store";
import { listSkills } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ skills: listSkills().map((s) => ({ ...s, name: s.file.split("/")[1], titulo: s.name })) });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const s = normalizeSkill(body);
    const commit = await saveSkill(s, g.user.name, body.novo === true);
    await audit(g.user.name, body.novo === true ? "habilidade.criada" : "habilidade.editada", s.name);
    return json({ skill: s, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
