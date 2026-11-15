import { audit } from "@/lib/db";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { setSecret } from "@/lib/vault";
import { SECRET, saveWaConfig, waConfig, waState } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const c = await waConfig();
  return json({ config: c, state: c.temChave ? await waState() : { ok: false, state: "sem chave", detail: "falta a chave da Evolution API" } });
}

/** Salva URL, instância, número do Felipe e, se veio, a chave (no cofre). */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  try {
    await saveWaConfig({
      ...(typeof body.url === "string" && body.url.trim() ? { url: str(body.url, 200) } : {}),
      ...(typeof body.instancia === "string" && body.instancia.trim() ? { instancia: str(body.instancia, 40) } : {}),
      ...(typeof body.numero === "string" ? { numero: str(body.numero, 30) } : {})
    });
    const key = str(body.chave, 400).trim();
    if (key) await setSecret(SECRET, key);
    await audit(g.user.name, "whatsapp.config", key ? "com chave nova" : "sem chave nova");
    const c = await waConfig();
    return json({ config: c, state: c.temChave ? await waState() : { ok: false, state: "sem chave", detail: "falta a chave" } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar.");
  }
}
