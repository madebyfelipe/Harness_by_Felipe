import { fail, guard, json } from "@/lib/http";
import { MAX_SECONDS, SAMPLE_RATE, transcribe } from "@/lib/transcribe";

export const maxDuration = 300;

/**
 * Recebe o áudio já decodificado no navegador: PCM mono Float32, 16 kHz
 * (application/octet-stream). Transcreve na própria VPS e devolve o texto.
 */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length % 4 !== 0) return fail("Áudio vazio ou em formato inesperado.");
  if (buf.length > SAMPLE_RATE * MAX_SECONDS * 4) return fail(`Áudio maior que ${MAX_SECONDS / 60} minutos.`, 413);
  const audio = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  try {
    const { text, ms } = await transcribe(audio);
    return json({ text, ms, seconds: Math.round(audio.length / SAMPLE_RATE) });
  } catch (e) {
    console.error("[central] transcrição falhou:", e);
    return fail(`Não consegui transcrever: ${e instanceof Error ? e.message : "erro"}`, 500);
  }
}
