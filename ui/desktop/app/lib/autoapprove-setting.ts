import { kvGet } from "./db";

/** Modo automático ligado? Padrão: ligado (pedido do Felipe, 15/11). CENTRAL_AUTO_APPROVE=0 muda o padrão. */
export async function autoApproveOn(): Promise<boolean> {
  const v = await kvGet("aprovacao.auto");
  if (v === "1") return true;
  if (v === "0") return false;
  return process.env.CENTRAL_AUTO_APPROVE !== "0";
}

/** Navegador em modo sozinho? Ações no site (clicar, digitar, enviar) rodam sem cartão e ficam registradas. Padrão: desligado. */
export async function browserAutoOn(): Promise<boolean> {
  return (await kvGet("navegador.auto")) === "1";
}
