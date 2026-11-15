import { json } from "@/lib/http";

// Único endereço sem login: responde só que o processo está vivo.
export const dynamic = "force-dynamic";

export function GET() {
  return json({ ok: true });
}
