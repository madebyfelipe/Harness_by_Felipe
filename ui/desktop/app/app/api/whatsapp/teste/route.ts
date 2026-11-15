import { fail, guard, json } from "@/lib/http";
import { notifyFelipe } from "@/lib/whatsapp";

/** Mensagem de teste para o número do Felipe (botão dele = aprovação do envio). */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const r = await notifyFelipe("Teste da Central: os avisos de rotina chegam por aqui.", g.user.name);
  return r.sent ? json(r) : fail(r.detail, 409);
}
