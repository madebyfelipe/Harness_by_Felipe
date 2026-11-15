import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { createProject, listProjects } from "@/lib/projects";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ projects: await listProjects() });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const project = await createProject({ name: str(body.name, 80), description: str(body.description, 500), instructions: str(body.instructions, 8000) });
    await audit(g.user.name, "projeto.criar", project.name);
    return json({ project });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não criou.");
  }
}
