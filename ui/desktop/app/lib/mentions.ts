import { listConnectors } from "./connectors";
import { getProject, projectBrief } from "./projects";
import { getAgent } from "./repo";

export type Mentions = { blocks: string[]; agent?: string };

/**
 * Lê o projeto da conversa e os @ da mensagem: @projeto traz as instruções do projeto,
 * @agente manda o pedido direto para esse agente, @conector diz qual app usar.
 */
export async function resolveMentions(text: string, projectId: string | null): Promise<Mentions> {
  const blocks: string[] = [];
  const seen = new Set<string>();
  let agent: string | undefined;
  if (projectId) {
    const p = await getProject(projectId);
    if (p) {
      blocks.push(projectBrief(p));
      seen.add(p.id);
    }
  }
  const tags = [...text.matchAll(/(?:^|[\s(])@([a-z0-9][a-z0-9_-]{0,49})/gi)].map((m) => m[1].toLowerCase());
  const connectors = tags.length ? listConnectors().connectors : [];
  for (const tag of new Set(tags)) {
    const p = await getProject(tag);
    if (p) {
      if (!seen.has(p.id)) blocks.push(projectBrief(p));
      seen.add(p.id);
      continue;
    }
    const a = getAgent(tag);
    if (a && !a.paused && a.name !== "triagem") {
      agent = agent ?? a.name;
      blocks.push(`[O Felipe chamou @${a.name}: este pedido é para o agente \`${a.name}\`.]`);
      continue;
    }
    const c = connectors.find((x) => x.nome.toLowerCase() === tag);
    if (c) blocks.push(`[O Felipe chamou @${c.nome}: use o conector \`${c.nome}\`${c.tipo.includes("mcp") ? ` (ferramentas mcp__${c.nome}__*, ache com ToolSearch)` : ""} para isso.]`);
  }
  return { blocks, agent };
}
