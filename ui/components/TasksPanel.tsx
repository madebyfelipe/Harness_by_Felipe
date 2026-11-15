"use client";

import { useEffect, useState } from "react";
import type { TaskItem } from "@/lib/chat";

/*
 * Painel "Tasks" acima da caixa do chat: a lista que o agente mantém com a
 * ferramenta tarefas. Contador feito/total e recolhe com um clique.
 */

const LABEL: Record<TaskItem["status"], string> = { pending: "pendente", in_progress: "fazendo", done: "feito" };

export function TasksPanel({ items, live }: { items: TaskItem[]; live: boolean }) {
  const done = items.filter((t) => t.status === "done").length;
  const all = done === items.length;
  // Aberto enquanto trabalha; terminada a lista, fica recolhido até o Felipe abrir.
  const [open, setOpen] = useState(live || !all);
  useEffect(() => {
    if (live && !all) setOpen(true);
  }, [live, all]);
  if (!items.length) return null;
  return (
    <section className={`tasks${open ? " tasks--open" : ""}`} data-testid="tasks" aria-label="Tarefas do agente">
      <button type="button" className="tasks__head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={`tasks__mark tasks__mark--${all ? "done" : live ? "in_progress" : "pending"}`} aria-hidden="true" />
        <strong>Tasks</strong>
        <span className="tasks__count">
          {done}/{items.length}
        </span>
        <svg className="tasks__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <ul className="tasks__list">
          {items.map((t, i) => (
            <li key={i} className={`tasks__item tasks__item--${t.status}`}>
              <span className={`tasks__mark tasks__mark--${t.status}`} aria-label={LABEL[t.status]} />
              <span>{t.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
