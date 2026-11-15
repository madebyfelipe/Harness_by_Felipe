"use client";

import { useEffect, useRef, useState } from "react";

type Ctx = { total: number; max: number; pct: number; cats: { id: string; name: string; tokens: number; kind: string }[] };

const NAMES: Record<string, string> = {
  system_prompt: "Instruções do sistema",
  system_tools: "Ferramentas",
  mcp_tools: "Ferramentas de apps",
  mcp_instructions: "Instruções de apps",
  custom_agents: "Subagentes",
  memory_files: "Memória",
  skills: "Habilidades",
  messages: "Conversa e resultados de ferramentas",
  autocompact_buffer: "Reserva para resumir",
  compact_buffer: "Reserva para resumir",
  free_space: "Livre"
};
const COLORS: Record<string, string> = {
  system_prompt: "#4c8dff",
  system_tools: "#9b7bff",
  mcp_tools: "#c06bff",
  mcp_instructions: "#c06bff",
  custom_agents: "#e0a526",
  skills: "#e0a526",
  memory_files: "#3fbf8f",
  messages: "#ef3b4f",
  autocompact_buffer: "#6b6b6b",
  compact_buffer: "#6b6b6b",
  free_space: "transparent"
};

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/** Janela de contexto da conversa (dado do próprio Claude Code ao fim da última resposta). */
export function ContextMeter({ ctx, onNewChat }: { ctx: Ctx | null; onNewChat: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const pct = ctx ? Math.min(100, Math.max(0, ctx.pct)) : 0;
  const r = 7;
  const c = 2 * Math.PI * r;
  const used = ctx ? ctx.cats.filter((x) => x.kind === "used" || x.kind === "buffer") : [];
  const free = ctx ? ctx.cats.find((x) => x.kind === "free") : undefined;

  return (
    <div className="ctxm" ref={ref}>
      <button type="button" className="ctxm__btn" aria-label={ctx ? `Janela de contexto: ${pct}% usada` : "Janela de contexto"} title="Janela de contexto" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <circle cx="9" cy="9" r={r} fill="none" stroke={pct >= 80 ? "var(--red-ink)" : "currentColor"} strokeWidth="2" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 9 9)" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="ctxm__pop" role="dialog" aria-label="Janela de contexto">
          <div className="ctxm__top">
            <strong>Contexto</strong>
            <span className="muted">{ctx ? `${pct}% usado` : "sem leitura"}</span>
          </div>
          {ctx ? (
            <>
              <div className="ctxm__bar" aria-hidden="true">
                {used.map((x) => (
                  <i key={x.id} style={{ width: `${Math.max(0.6, (x.tokens / ctx.max) * 100)}%`, background: COLORS[x.id] ?? "#888" }} />
                ))}
              </div>
              <p className="small muted">
                {fmt(ctx.total)} de {fmt(ctx.max)} tokens
              </p>
              <ul className="ctxm__list">
                {[...used, ...(free ? [free] : [])].map((x) => (
                  <li key={x.id}>
                    <i style={{ background: COLORS[x.id] ?? "#888", border: x.kind === "free" ? "1px solid var(--line-strong)" : 0 }} />
                    <span>{NAMES[x.id] ?? x.name}</span>
                    <strong>{fmt(x.tokens)}</strong>
                  </li>
                ))}
              </ul>
              <p className="small muted">Quando enche, a conversa é resumida sozinha. Assunto novo gasta menos numa conversa nova.</p>
            </>
          ) : (
            <p className="small muted">Aparece depois da próxima resposta de um modelo Claude nesta conversa.</p>
          )}
          <button
            type="button"
            className="ctxm__new"
            onClick={() => {
              setOpen(false);
              onNewChat();
            }}
          >
            + Nova conversa
          </button>
        </div>
      ) : null}
    </div>
  );
}
