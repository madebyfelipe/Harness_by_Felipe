"use client";

import { useEffect, useRef, useState } from "react";
import type { SubItem, SubThread } from "@/lib/chat";
import { agentName } from "./ConversationList";
import { IconPlus, IconTool } from "./Icons";
import { Markdown } from "./Markdown";

/*
 * Abas no topo do chat: a conversa principal e uma aba por subagente que
 * trabalhou nela. Cada aba mostra o pedido de quem delegou, o que o
 * subagente fez e a resposta que ele devolveu.
 */

const fmtSecs = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const STATUS: Record<SubThread["status"], string> = { running: "trabalhando", done: "concluído", error: "sem resposta", stopped: "parado" };

/** Cor estável por agente, para reconhecer a aba de relance. */
function hue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function Avatar({ name }: { name: string }) {
  const label = agentName(name);
  return (
    <span className="subtab__av" style={{ ["--h" as string]: hue(name) }} aria-hidden="true">
      {label.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Junta as threads gravadas nas mensagens com as da execução ao vivo (a ao vivo vence). */
export function mergeSubs(saved: SubThread[], live: SubThread[]): SubThread[] {
  const map = new Map<string, SubThread>();
  for (const t of saved) map.set(t.id, t);
  for (const t of live) map.set(t.id, t);
  return [...map.values()].sort((a, b) => a.startedAt - b.startedAt);
}

/** Aplica um evento da execução (sub_start / sub_item / sub_end) à lista ao vivo. */
export function applySubEvent(list: SubThread[], type: string, d: Record<string, unknown>): SubThread[] {
  if (type === "sub_start") {
    const t = d as unknown as SubThread;
    return list.some((x) => x.id === t.id) ? list : [...list, { ...t, items: t.items ?? [] }];
  }
  const id = String(d.id ?? "");
  return list.map((t) => {
    if (t.id !== id) return t;
    if (type === "sub_item") return { ...t, items: [...t.items, d.item as SubItem] };
    if (type === "sub_items") return { ...t, items: (d.items as SubItem[]) ?? t.items, ...(typeof d.model === "string" ? { model: d.model } : {}) };
    if (type === "sub_end") return { ...t, status: d.status as SubThread["status"], result: String(d.result ?? ""), endedAt: Number(d.endedAt) || Date.now() };
    return t;
  });
}

type TabsProps = {
  mainAgent: string;
  mainLabel: string;
  subs: SubThread[];
  active: string | null;
  onPick: (id: string | null) => void;
};

export function SubTabs({ mainAgent, mainLabel, subs, active, onPick }: TabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Aba nova de subagente aparece no fim: rola até ela.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [subs.length]);
  return (
    <div className="subtabs" data-testid="subtabs">
      <div className="subtabs__list" role="tablist" aria-label="Conversa e subagentes" ref={ref}>
        <button type="button" role="tab" aria-selected={active === null} className={`subtab${active === null ? " subtab--on" : ""}`} onClick={() => onPick(null)} title="Conversa principal">
          <Avatar name={mainAgent} />
          <span className="subtab__name">{mainLabel}</span>
        </button>
        {subs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`subtab${active === t.id ? " subtab--on" : ""}`}
            onClick={() => onPick(t.id)}
            title={`${agentName(t.agent)}${t.title ? ` · ${t.title}` : ""} · ${STATUS[t.status]}`}
            data-testid="subtab"
          >
            <Avatar name={t.agent} />
            <span className="subtab__name">{agentName(t.agent)}</span>
            {t.title ? <span className="subtab__title">{t.title}</span> : null}
            {t.status === "running" ? <span className="subtab__dot" aria-label="trabalhando" /> : t.status !== "done" ? <span className="subtab__dot subtab__dot--bad" aria-label={STATUS[t.status]} /> : null}
          </button>
        ))}
      </div>
      <a className="subtabs__new" href="/" aria-label="Nova conversa" title="Nova conversa">
        <IconPlus size={16} />
      </a>
    </div>
  );
}

/** Texto e ferramentas na ordem; ferramentas seguidas viram uma lista só. */
function Items({ items }: { items: SubItem[] }) {
  const groups: ({ k: "text"; text: string } | { k: "tools"; list: { name: string; summary: string }[] })[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (it.k === "tool") {
      if (last?.k === "tools") last.list.push(it);
      else groups.push({ k: "tools", list: [it] });
    } else groups.push({ k: "text", text: it.text });
  }
  return (
    <>
      {groups.map((g, i) =>
        g.k === "text" ? (
          <div className="msg__bubble" key={i}>
            <Markdown text={g.text} />
          </div>
        ) : (
          <ul className="steps" key={i}>
            {g.list.map((t, j) => (
              <li key={j}>
                <IconTool size={14} />
                <span>
                  <b>{t.name}</b> {t.summary}
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </>
  );
}

function Elapsed({ from, to }: { from: number; to?: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (to) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [to]);
  return <>{fmtSecs((to ?? Date.now()) - from)}</>;
}

type ViewProps = {
  thread: SubThread;
  all: SubThread[];
  mainAgent: string;
  modelLabel: (id: string) => string;
  onPick: (id: string | null) => void;
};

export function SubView({ thread: t, all, mainAgent, modelLabel, onPick }: ViewProps) {
  const parent = t.parent ? all.find((x) => x.id === t.parent) : undefined;
  const from = agentName(parent?.agent ?? mainAgent);
  const children = all.filter((x) => x.parent === t.id);
  return (
    <div className="chat__inner subview" data-testid="subview">
      <header className="subview__head">
        <span className="kicker">
          Subagente · {agentName(t.agent)}
          {t.model ? ` · ${modelLabel(t.model)}` : ""} · {STATUS[t.status]} · <Elapsed from={t.startedAt} to={t.endedAt} />
        </span>
        {t.title ? <strong className="subview__title">{t.title}</strong> : null}
        <button type="button" className="link small" onClick={() => onPick(t.parent)}>
          ← voltar para {parent ? agentName(parent.agent) : "a conversa"}
        </button>
      </header>

      <article className="msg msg--user subview__ask">
        <span className="kicker kicker--plain">{from} pediu</span>
        <div className="msg__body">
          <Markdown text={t.prompt || "(pedido vazio)"} />
        </div>
      </article>

      <article className="msg">
        <span className="kicker">{agentName(t.agent)}</span>
        {t.items.length ? <Items items={t.items} /> : t.status === "running" ? null : <p className="small muted">Nenhum passo registrado.</p>}
        {children.length ? (
          <div className="subview__kids">
            {children.map((c) => (
              <button type="button" key={c.id} className="subchip" onClick={() => onPick(c.id)}>
                Chamou {agentName(c.agent)}
                {c.title ? ` · ${c.title}` : ""} →
              </button>
            ))}
          </div>
        ) : null}
        {t.status === "running" ? (
          <p className="liveline">
            <span className="liveline__dot" aria-hidden="true" />
            <span className="liveline__label">Trabalhando…</span>
          </p>
        ) : null}
      </article>

      {t.status !== "running" ? (
        <article className="msg">
          <span className="kicker">Resposta para {from}</span>
          {t.result ? (
            <div className="msg__bubble">
              <Markdown text={t.result} />
            </div>
          ) : (
            <p className="notice notice--plain">{t.status === "stopped" ? "Parado junto com a execução." : "O subagente não devolveu resposta."}</p>
          )}
        </article>
      ) : null}
    </div>
  );
}

/** Chips na resposta principal: abrem a aba de cada subagente. */
export function SubChips({ subs, onPick }: { subs: SubThread[]; onPick: (id: string) => void }) {
  const top = subs.filter((t) => !t.parent);
  if (!top.length) return null;
  return (
    <div className="subchips">
      {top.map((t) => (
        <button type="button" key={t.id} className="subchip" onClick={() => onPick(t.id)} title="Ver a conversa deste subagente">
          <Avatar name={t.agent} />
          {agentName(t.agent)}
          {t.title ? <span className="muted"> · {t.title}</span> : null}
        </button>
      ))}
    </div>
  );
}
