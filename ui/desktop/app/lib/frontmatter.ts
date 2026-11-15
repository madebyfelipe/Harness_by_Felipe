import YAML from "yaml";

export type Parsed = { data: Record<string, unknown>; body: string; hasFrontmatter: boolean };

/** Separa o cabeçalho YAML (entre `---`) do corpo de um .md. */
export function parseFrontmatter(text: string): Parsed {
  const src = text.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src, hasFrontmatter: false };
  let data: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(m[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { data, body: src.slice(m[0].length), hasFrontmatter: true };
}

export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  const head = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${head}\n---\n${body.replace(/^\n+/, "")}`;
}

/** `tools: Read, Bash` (formato do Claude Code) ou lista YAML → lista. */
export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}
