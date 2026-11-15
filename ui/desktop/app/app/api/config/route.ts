import { audit, kvSet } from "@/lib/db";
import { guard, json, readJson } from "@/lib/http";
import { autoApproveOn, browserAutoOn } from "@/lib/autoapprove-setting";

/** Preferências da Central: modo automático de aprovação e navegador em modo sozinho. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ autoApprove: await autoApproveOn(), browserAuto: await browserAutoOn() });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson<{ autoApprove?: boolean; browserAuto?: boolean }>(req);
  if (typeof body.autoApprove === "boolean") {
    await kvSet("aprovacao.auto", body.autoApprove ? "1" : "0");
    await audit(g.user.name, "aprovacao.modo_automatico", body.autoApprove ? "ligado" : "desligado");
  }
  if (typeof body.browserAuto === "boolean") {
    await kvSet("navegador.auto", body.browserAuto ? "1" : "0");
    await audit(g.user.name, "navegador.modo_sozinho", body.browserAuto ? "ligado" : "desligado");
  }
  return json({ autoApprove: await autoApproveOn(), browserAuto: await browserAutoOn() });
}
