import fs from "node:fs";
import path from "node:path";
import { cfg } from "./config";

/*
 * Transcrição local, na própria VPS: Whisper small (transformers.js + ONNX Runtime),
 * sem provedor novo. O whisper.cpp pronto para Linux usa instruções que o processador
 * da VPS não tem (Illegal instruction) e o contêiner não tem compilador; o modelo e a
 * qualidade são os mesmos do whisper small.
 *
 * O modelo ocupa ~1,3 GB de RAM carregado. Sobe no primeiro áudio e é solto depois de
 * IDLE_MS sem uso, porque a VPS tem pouca memória livre.
 */

const MODEL = process.env.CENTRAL_WHISPER_MODEL || "onnx-community/whisper-small";
const IDLE_MS = 10 * 60_000;
export const SAMPLE_RATE = 16_000;
export const MAX_SECONDS = 15 * 60;

type Asr = ((audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text?: string } | { text?: string }[]>) & { dispose?: () => Promise<void> };

const g = globalThis as unknown as { __centralAsr?: Promise<Asr>; __centralAsrTimer?: NodeJS.Timeout; __centralAsrQueue?: Promise<unknown> };

export function whisperCacheDir(): string {
  const dir = process.env.CENTRAL_WHISPER_CACHE || path.join(cfg().dataDir, "whisper");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

async function load(): Promise<Asr> {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = whisperCacheDir();
  env.allowRemoteModels = process.env.CENTRAL_WHISPER_OFFLINE !== "1";
  const asr = await pipeline("automatic-speech-recognition", MODEL, { dtype: { encoder_model: "q8", decoder_model_merged: "q8" } as never });
  return asr as unknown as Asr;
}

function touch(): void {
  if (g.__centralAsrTimer) clearTimeout(g.__centralAsrTimer);
  g.__centralAsrTimer = setTimeout(() => {
    const current = g.__centralAsr;
    g.__centralAsr = undefined;
    void current?.then((a) => a.dispose?.()).catch(() => undefined);
  }, IDLE_MS);
  g.__centralAsrTimer.unref?.();
}

/** Áudio mono em Float32, 16 kHz. Um áudio por vez (memória). */
export async function transcribe(audio: Float32Array, language = "portuguese"): Promise<{ text: string; ms: number }> {
  if (audio.length < SAMPLE_RATE / 4) return { text: "", ms: 0 };
  if (audio.length > SAMPLE_RATE * MAX_SECONDS) throw new Error(`Áudio maior que ${MAX_SECONDS / 60} minutos.`);
  const job = (g.__centralAsrQueue ?? Promise.resolve()).then(async () => {
    const t0 = Date.now();
    g.__centralAsr ??= load().catch((e) => {
      g.__centralAsr = undefined;
      throw e;
    });
    const asr = await g.__centralAsr;
    touch();
    const out = await asr(audio, { language, task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
    touch();
    const text = (Array.isArray(out) ? out.map((o) => o.text ?? "").join(" ") : out.text ?? "").replace(/\s+/g, " ").trim();
    return { text, ms: Date.now() - t0 };
  });
  g.__centralAsrQueue = job.catch(() => undefined);
  return job;
}
