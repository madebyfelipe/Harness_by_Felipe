import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { listSecretNames, setSecret } from "@/lib/vault";

/** Só nomes e datas; o valor nunca volta. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ secrets: await listSecretNames() });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const name = str(body.name, 64).trim();
  try {
    await setSecret(name, str(body.value, 8000));
    await audit(g.user.name, "cofre.salvo", name);
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
