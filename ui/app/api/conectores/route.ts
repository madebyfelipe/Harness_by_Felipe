import { lastStatuses, listConnectors, normalizeConnector, saveConnector, secretState } from "@/lib/connectors";
import { loadVault } from "@/lib/vault";
import { audit } from "@/lib/db";
import { fail, guard, json, readJson } from "@/lib/http";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  await loadVault();
  const { connectors, errors } = listConnectors();
  const status = await lastStatuses();
  return json({ connectors: connectors.map((c) => ({ ...c, secretState: secretState(c), status: status[c.nome] ?? null })), errors });
}

/** Adiciona um servidor MCP qualquer: grava connectors/<nome>.yaml e faz commit. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    const agentes = Array.isArray(body.agentes) && body.agentes.length ? body.agentes : ["*"];
    if (body.tipo === "rest") {
      const c = normalizeConnector({
        nome: body.nome,
        titulo: body.titulo || body.nome,
        tipo: "rest",
        prioridade: 2,
        uso: body.uso,
        endpoint: body.saude,
        segredo: body.segredo,
        agentes,
        saude: { metodo: "GET", url: body.saude, auth: body.segredo ? "bearer" : "nenhuma", espera: [200] }
      });
      const commit = await saveConnector(c, g.user.name, true);
      await audit(g.user.name, "conector.criado", c.nome);
      return json({ connector: c, commit });
    }
    const c = normalizeConnector({
      nome: body.nome,
      titulo: body.titulo || body.nome,
      tipo: "mcp",
      prioridade: 1,
      uso: body.uso,
      segredo: body.segredo,
      agentes: Array.isArray(body.agentes) && body.agentes.length ? body.agentes : ["*"],
      mcp: { nome: body.mcpNome || body.nome, url: body.url, transporte: body.transporte }
    });
    const commit = await saveConnector(c, g.user.name, true);
    await audit(g.user.name, "conector.criado", c.nome);
    return json({ connector: c, commit });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
