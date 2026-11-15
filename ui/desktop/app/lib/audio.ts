/*
 * Áudio que chega de fora (nota de voz do WhatsApp) até o Whisper da Central.
 * O WhatsApp manda ogg/opus; o transcribe() recebe Float32 mono em 16 kHz.
 * A decodificação é feita em WebAssembly (ogg-opus-decoder), sem ffmpeg — esta
 * VPS não tem ffmpeg e o contêiner não tem compilador.
 */

const g = globalThis as unknown as { __centralOpus?: Promise<{ decodeFile: (d: Uint8Array) => Promise<{ channelData: Float32Array[]; sampleRate: number }> }> };

async function decoder() {
  g.__centralOpus ??= import("ogg-opus-decoder").then(async (m) => {
    const d = new m.OggOpusDecoder();
    await d.ready;
    return d as unknown as { decodeFile: (x: Uint8Array) => Promise<{ channelData: Float32Array[]; sampleRate: number }> };
  });
  return g.__centralOpus;
}

/** Junta os canais e reamostra para 16 kHz (média por janela; de 48 kHz dá 3 amostras por janela). */
function toMono16k(channels: Float32Array[], rate: number): Float32Array {
  const n = channels[0]?.length ?? 0;
  if (!n) return new Float32Array(0);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const c of channels) s += c[i] ?? 0;
    mono[i] = s / channels.length;
  }
  if (rate === 16_000) return mono;
  const ratio = rate / 16_000;
  const out = new Float32Array(Math.floor(n / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(n, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = start; j < end; j++) s += mono[j];
    out[i] = end > start ? s / (end - start) : 0;
  }
  return out;
}

/** Ogg/Opus (nota de voz do WhatsApp) em Float32 16 kHz mono. */
export async function decodeOggOpus(bytes: Uint8Array): Promise<Float32Array> {
  // O contêiner começa com "OggS"; qualquer outra coisa (mp3, m4a) é recusada com mensagem clara.
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== "OggS") throw new Error("áudio em formato que a Central não decodifica aqui (só nota de voz ogg/opus)");
  const d = await decoder();
  const out = await d.decodeFile(bytes);
  return toMono16k(out.channelData, out.sampleRate);
}

export const AUDIO_HINT = "manda por áudio de voz do WhatsApp, ou escreve";
