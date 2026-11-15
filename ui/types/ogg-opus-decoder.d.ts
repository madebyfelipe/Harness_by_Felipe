/** Tipos do decodificador ogg/opus (o pacote não traz `.d.ts`). */
declare module "ogg-opus-decoder" {
  export class OggOpusDecoder {
    constructor(opts?: Record<string, unknown>);
    ready: Promise<void>;
    decodeFile(data: Uint8Array): Promise<{ channelData: Float32Array[]; samplesDecoded: number; sampleRate: number; errors?: unknown[] }>;
    reset(): Promise<void>;
    free(): void;
  }
}
