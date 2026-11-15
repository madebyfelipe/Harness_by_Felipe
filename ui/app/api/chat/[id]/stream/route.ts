import { guard } from "@/lib/http";
import { subscribe, type RunEvent } from "@/lib/runner";

export const dynamic = "force-dynamic";

/** Eventos da execução em andamento (SSE). Reconecta de onde parou pelo Last-Event-ID. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const after = Number(req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? 0) || 0;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      const send = (e: RunEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`));
        } catch {
          close();
          return;
        }
        if (e.type === "end") close();
      };
      unsubscribe = subscribe(id, after, send);
      if (!unsubscribe) {
        controller.enqueue(encoder.encode(`event: idle\ndata: {}\n\n`));
        close();
        return;
      }
      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          close();
        }
      }, 20_000);
      req.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      clearInterval(ping);
      unsubscribe?.();
    }
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" }
  });
}
