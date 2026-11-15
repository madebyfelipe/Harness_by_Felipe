import { nowIso } from "./config";
import { getDb } from "./db";

/* Projetos: agrupam conversas e levam instruções que entram em toda conversa do projeto. */

export type Project = { id: string; slug: string; name: string; description: string; instructions: string; created_at: string; updated_at: string };
export type ProjectSummary = Project & { conversations: number; last_at: string | null };

export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "projeto"
  );
}

async function freeSlug(base: string, except?: string): Promise<string> {
  const db = await getDb();
  for (let i = 1; ; i++) {
    const s = i === 1 ? base : `${base}-${i}`;
    const row = await db.get<{ id: string }>("SELECT id FROM projects WHERE slug = ?", [s]);
    if (!row || row.id === except) return s;
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await getDb();
  return db.all<ProjectSummary>(
    `SELECT p.*,
       (SELECT COUNT(*) FROM conversations c WHERE c.project_id = p.id AND c.archived = 0) AS conversations,
       (SELECT MAX(c.updated_at) FROM conversations c WHERE c.project_id = p.id AND c.archived = 0) AS last_at
     FROM projects p ORDER BY COALESCE((SELECT MAX(c.updated_at) FROM conversations c WHERE c.project_id = p.id), p.updated_at) DESC`
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get<Project>("SELECT * FROM projects WHERE id = ? OR slug = ?", [id, id]);
}

export async function createProject(input: { name: string; description?: string; instructions?: string }): Promise<Project> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Dê um nome ao projeto.");
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = nowIso();
  await db.run("INSERT INTO projects (id, slug, name, description, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    id,
    await freeSlug(slugify(name)),
    name,
    (input.description ?? "").slice(0, 500),
    (input.instructions ?? "").slice(0, 8000),
    now,
    now
  ]);
  return (await getProject(id))!;
}

export async function updateProject(id: string, patch: { name?: string; description?: string; instructions?: string }): Promise<Project> {
  const cur = await getProject(id);
  if (!cur) throw new Error("Projeto não encontrado.");
  const name = patch.name !== undefined ? patch.name.trim().slice(0, 80) || cur.name : cur.name;
  const db = await getDb();
  await db.run("UPDATE projects SET name = ?, slug = ?, description = ?, instructions = ?, updated_at = ? WHERE id = ?", [
    name,
    name === cur.name ? cur.slug : await freeSlug(slugify(name), cur.id),
    patch.description !== undefined ? patch.description.slice(0, 500) : cur.description,
    patch.instructions !== undefined ? patch.instructions.slice(0, 8000) : cur.instructions,
    nowIso(),
    cur.id
  ]);
  return (await getProject(cur.id))!;
}

/** Apaga o projeto; as conversas continuam, só saem do projeto. */
export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE conversations SET project_id = NULL WHERE project_id = ?", [id]);
  await db.run("DELETE FROM projects WHERE id = ?", [id]);
}

/** Bloco que entra no pedido quando a conversa é do projeto ou ele é chamado com @. */
export function projectBrief(p: Project): string {
  const body = [p.description && `Descrição: ${p.description}`, p.instructions && `Instruções do projeto:\n${p.instructions}`].filter(Boolean).join("\n");
  return `[Projeto "${p.name}" (@${p.slug})${body ? `]\n${body}` : "]"}`;
}
