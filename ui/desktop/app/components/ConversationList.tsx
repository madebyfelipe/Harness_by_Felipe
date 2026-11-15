"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { IconFolder, IconPlus, IconSearch } from "./Icons";
import { ModeSelector } from "./ModeSelector";

type Item = {
  id: string;
  title: string;
  mode: "chat" | "contexto";
  agent: string;
  model: string;
  updated_at: string;
  preview: string;
  previewRole: string | null;
  running?: boolean;
  route: { agent?: string } | null;
  project_name?: string | null;
};

export const REFRESH_EVENT = "central:conversas";

const AGENT_NAMES: Record<string, string> = { auto: "Central", contexto: "Contexto", orquestrador: "Orquestrador", chatgpt: "ChatGPT" };
export function agentName(a: string): string {
  return AGENT_NAMES[a] ?? a.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function hora(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat("pt-BR", sameDay ? { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" } : { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(d);
}

function group(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === y.toDateString()) return "Ontem";
  if (today.getTime() - d.getTime() < 7 * 86400_000) return "Últimos 7 dias";
  return "Antes";
}

/** Coluna de conversas (busca, grupos, última mensagem), como a do OpenBot. */
export function ConversationList({ initialMode, page = false }: { initialMode: "vps" | "local"; page?: boolean }) {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const qRef = useRef<HTMLInputElement>(null);

  // Ctrl+K (ou ⌘K) abre a busca, como no Claude.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
        setTimeout(() => qRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const load = useCallback(async (query: string) => {
    try {
      const r = await api<{ conversations: Item[] }>(`/api/chat?view=lista${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      setItems(r.conversations);
    } catch {
      setItems((x) => x ?? []);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(q.trim()), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  useEffect(() => {
    const again = () => void load(q.trim());
    window.addEventListener(REFRESH_EVENT, again);
    const t = setInterval(again, 20_000);
    return () => {
      window.removeEventListener(REFRESH_EVENT, again);
      clearInterval(t);
    };
  }, [q, load]);

  const groups = useMemo(() => {
    const out: { name: string; items: Item[] }[] = [];
    const running = (items ?? []).filter((i) => i.running);
    if (running.length) out.push({ name: "Rodando agora", items: running });
    for (const i of (items ?? []).filter((x) => !x.running)) {
      const name = group(i.updated_at);
      const g = out.find((x) => x.name === name);
      if (g) g.items.push(i);
      else out.push({ name, items: [i] });
    }
    return out;
  }, [items]);

  return (
    <aside className={`clist${page ? " clist--page" : ""}`} aria-label="Conversas">
      <div className="clist__head">
        <ModeSelector initialMode={initialMode} />
      </div>
      <nav className="clist__nav" aria-label="Atalhos">
        <Link className="cnav" href="/" aria-current={pathname === "/" ? "page" : undefined}>
          <IconPlus size={16} /> <span>Nova conversa</span>
        </Link>
        {searching || q ? (
          <div className="cnav cnav--search">
            <IconSearch size={16} />
            <label className="sr-only" htmlFor="clist-q">
              Buscar conversas
            </label>
            <input
              id="clist-q"
              ref={qRef}
              type="search"
              placeholder="Buscar conversas"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => !q && setSearching(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQ("");
                  setSearching(false);
                }
              }}
            />
          </div>
        ) : (
          <button type="button" className="cnav" onClick={() => setSearching(true)}>
            <IconSearch size={16} /> <span>Buscar</span>
            <kbd>Ctrl+K</kbd>
          </button>
        )}
        <Link className="cnav" href="/projetos" aria-current={pathname.startsWith("/projetos") ? "page" : undefined}>
          <IconFolder size={16} /> <span>Projetos</span>
        </Link>
      </nav>
      <div className="clist__scroll">
        {items === null ? <p className="small muted clist__empty">Carregando…</p> : null}
        {items && !items.length ? <p className="small muted clist__empty">{q ? "Nada encontrado." : "Nenhuma conversa ainda. Fale ou escreva no chat."}</p> : null}
        {groups.map((g) => (
          <section key={g.name}>
            <h2 className="clist__group">{g.name}</h2>
            <ul>
              {g.items.map((c) => {
                const href = `/${c.mode === "contexto" ? "contexto" : "chat"}/${c.id}`;
                const who = c.mode === "contexto" ? "contexto" : c.agent === "auto" ? c.route?.agent ?? "auto" : c.agent;
                return (
                  <li key={c.id}>
                    <Link className="citem" href={href} aria-current={pathname === href ? "page" : undefined}>
                      <span className={`avatar${c.agent === "auto" ? " avatar--auto" : ""}`} aria-hidden="true">
                        {agentName(c.agent === "auto" ? "auto" : who).charAt(0)}
                        {c.running ? <i className="avatar__live" /> : null}
                      </span>
                      <span className="citem__body">
                        <span className="citem__top">
                          <span className="citem__title">{c.title}</span>
                          <span className="citem__time">{hora(c.updated_at)}</span>
                        </span>
                        <span className="citem__sub">
                          <span className="citem__tag">{c.project_name ? c.project_name : agentName(who)}</span>
                          <span className="citem__preview">{c.running ? "trabalhando…" : c.preview || "sem mensagens"}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
