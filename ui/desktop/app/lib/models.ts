export type ModelInfo = { id: string; alias: string; label: string; note: string };

/** Do mais barato ao mais forte: é também a escada padrão do "subir de modelo". */
export const MODELS: ModelInfo[] = [
  { id: "claude-haiku-5-5", alias: "haiku", label: "Haiku 5.5", note: "volume" },
  { id: "claude-sonnet-5-5", alias: "sonnet", label: "Sonnet 5.5", note: "executor" },
  { id: "claude-opus-5-5", alias: "opus", label: "Opus 5.5", note: "degrau intermediário" },
  { id: "claude-fable-5-2", alias: "fable", label: "Fable 5.2", note: "orquestrador" }
];

export const DEFAULT_ORCHESTRATOR_MODEL = "claude-fable-5-2";
export const DEFAULT_CONTEXT_MODEL = "claude-sonnet-5-5";

export function resolveModel(aliasOrId: string | undefined, fallback = "claude-sonnet-5-5"): string {
  if (!aliasOrId) return fallback;
  const key = aliasOrId.trim().toLowerCase();
  const found = MODELS.find((m) => m.id === key || m.alias === key);
  return found ? found.id : fallback;
}

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

export function isKnownModel(id: string): boolean {
  return MODELS.some((m) => m.id === id);
}

/** Próximo degrau acima do modelo atual; null se já está no topo. */
export function nextModel(current: string, ladder?: string[]): string | null {
  const steps = (ladder && ladder.length ? ladder.map((s) => resolveModel(s, "")) : MODELS.map((m) => m.id)).filter(Boolean);
  const order = MODELS.map((m) => m.id);
  const rank = order.indexOf(current);
  const above = steps.filter((s) => order.indexOf(s) > rank).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return above[0] ?? null;
}
