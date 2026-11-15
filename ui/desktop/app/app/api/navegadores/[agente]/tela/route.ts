import { guard } from "@/lib/http";
import { screenshot } from "@/lib/browsers";

/** Imagem atual da tela do navegador do agente (a tela Navegadores busca de novo a cada instante). */
export async function GET(req: Request, ctx: { params: Promise<{ agente: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { agente } = await ctx.params;
  try {
    const img = await screenshot(agente);
    return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
