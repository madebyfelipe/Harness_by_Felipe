"use client";

import { useEffect, useRef, useState } from "react";
import { IconSend } from "./Icons";

function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function at(h: number, m = 0, plusDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + plusDays);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Botão de enviar com seletor na mesma pill: enviar agora ou agendar. Rodando, vira "pôr na fila". */
export function SendPill({ disabled, queued, onSend, onSchedule }: { disabled: boolean; queued: boolean; onSend: () => void; onSchedule: (when: Date) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(false);
  const [when, setWhen] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !form) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && (setOpen(false), setForm(false));
    const key = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setForm(false));
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, form]);

  const schedule = async (d: Date) => {
    setErr("");
    if (d.getTime() < Date.now()) return setErr("Escolha um horário no futuro.");
    try {
      await onSchedule(d);
      setForm(false);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não agendou.");
    }
  };
  const presets: { label: string; d: () => Date }[] = [
    { label: "Em 1 hora", d: () => new Date(Date.now() + 3600_000) },
    { label: "Hoje 18:00", d: () => at(18) },
    { label: "Amanhã 09:00", d: () => at(9, 0, 1) }
  ].filter((p) => p.d().getTime() > Date.now());

  return (
    <div className="sendpill" ref={ref}>
      <button type="button" className="sendpill__main" onClick={onSend} disabled={disabled} aria-label={queued ? "Pôr na fila (sai quando terminar)" : "Enviar agora"} title={queued ? "Pôr na fila: sai quando a execução atual terminar" : "Enviar agora"}>
        <IconSend />
        <span className="sr-only">{queued ? "Pôr na fila" : "Enviar"}</span>
      </button>
      <button type="button" className="sendpill__more" aria-label="Mais formas de enviar" aria-expanded={open} disabled={disabled} onClick={() => (setOpen((o) => !o), setForm(false))}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && !form ? (
        <div className="sendpill__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => (setOpen(false), onSend())}>
            <strong>{queued ? "Pôr na fila" : "Enviar agora"}</strong>
            <span>{queued ? "Sai quando a execução atual terminar" : "Enter"}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setWhen(localInput(new Date(Date.now() + 3600_000)));
              setForm(true);
            }}
          >
            <strong>Agendar…</strong>
            <span>Escolha dia e hora para mandar</span>
          </button>
        </div>
      ) : null}
      {form ? (
        <form
          className="sendpill__menu sendpill__form"
          onSubmit={(e) => {
            e.preventDefault();
            void schedule(new Date(when));
          }}
        >
          <strong>Agendar mensagem</strong>
          <div className="sendpill__presets">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => void schedule(p.d())}>
                {p.label}
              </button>
            ))}
          </div>
          <input type="datetime-local" className="field field--sm" value={when} min={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} aria-label="Dia e hora" required />
          {err ? <p className="small notice">{err}</p> : null}
          <button className="btn btn--sm btn--on">Agendar</button>
        </form>
      ) : null}
    </div>
  );
}
