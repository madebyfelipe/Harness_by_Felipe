import { listConversationPreviews } from "@/lib/chat";
import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { deleteProject, getProject, updateProject } from "@/lib/projects";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const project = await getProject((await ctx.params).id);
  if (!project) return fail("Projeto não encontrado.", 404);
  return json({ project, conversations: await listConversationPreviews(100, "", project.id) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const project = await updateProject((await ctx.params).id, {
      ...(typeof body.name === "string" ? { name: str(body.name, 80) } : {}),
      ...(typeof body.description === "string" ? { description: str(body.description, 500) } : {}),
      ...(typeof body.instructions === "string" ? { instructions: str(body.instructions, 8000) } : {}),
      ...(typeof body.folder === "string" ? { folder: str(body.folder, 400) } : {})
    });
    await audit(g.user.name, "projeto.editar", project.name);
    return json({ project });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não salvou.");
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.error) return g.error;
  const project = await getProject((await ctx.params).id);
  if (!project) return fail("Projeto não encontrado.", 404);
  await deleteProject(project.id);
  await audit(g.user.name, "projeto.apagar", project.name);
  return json({ ok: true });
}
