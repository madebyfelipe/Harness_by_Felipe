import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { finishRegistration } from "@/lib/webauthn";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson<{ response?: RegistrationResponseJSON; name?: string }>(req);
  if (!body.response) return fail("Resposta da passkey ausente.");
  try {
    await finishRegistration(g.user, body.response, str(body.name, 60));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível salvar a passkey.");
  }
  return json({ ok: true });
}
