import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { listConnectors } from "@/lib/connectors";
import { listAgents } from "@/lib/repo";
import { listSecretNames, recentUses, setScope, setSecret } from "@/lib/vault";

/** Só nomes, datas, escopo e uso; o valor nunca volta. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { connectors } = listConnectors();
  const secrets = (await listSecretNames()).map((s) => ({ ...s, apps: connectors.filter((c) => c.segredo === s.name).map((c) => c.titulo) }));
  return json({ secrets, uses: await recentUses(40), agents: listAgents().map((a) => a.name) });
}

/** Guarda (ou troca) um valor. Com `agents`, define também quem pode usar. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const name = str(body.name, 64).trim();
  try {
    await setSecret(name, str(body.value, 8000));
    if (Array.isArray(body.agents)) await setScope(name, body.agents.map(String));
    await audit(g.user.name, "cofre.salvo", name);
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
