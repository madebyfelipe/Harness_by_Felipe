import { audit, kvSet } from "@/lib/db";
import { guard, json, readJson } from "@/lib/http";
import { autoApproveOn } from "@/lib/autoapprove-setting";

/** Preferências da Central. Hoje: o modo automático de aprovação. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ autoApprove: await autoApproveOn() });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson<{ autoApprove?: boolean }>(req);
  if (typeof body.autoApprove === "boolean") {
    await kvSet("aprovacao.auto", body.autoApprove ? "1" : "0");
    await audit(g.user.name, "aprovacao.modo_automatico", body.autoApprove ? "ligado" : "desligado");
  }
  return json({ autoApprove: await autoApproveOn() });
}
