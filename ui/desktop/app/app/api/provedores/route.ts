import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { codexJs, createProvider, failoverOn, listProviders, publicProvider, setFailover, type ProviderKind } from "@/lib/providers";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ providers: (await listProviders()).map(publicProvider), failover: await failoverOn(), codexInstalled: Boolean(codexJs()) });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  if (typeof body.failover === "boolean") {
    await setFailover(body.failover);
    await audit(g.user.name, "provedores.troca", String(body.failover));
    return json({ failover: body.failover });
  }
  const kind = str(body.kind, 20) as ProviderKind;
  if (!["claude", "claude-api", "codex", "deepseek"].includes(kind)) return fail("Tipo de provedor desconhecido.");
  try {
    const p = await createProvider({ kind, name: str(body.name, 60), apiKey: str(body.apiKey, 400) });
    await audit(g.user.name, "provedores.criar", `${kind} · ${p.name}`);
    return json({ provider: publicProvider(p) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível adicionar.");
  }
}
