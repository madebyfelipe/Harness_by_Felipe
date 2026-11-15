"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { CookieForm } from "./BrowserLive";
import { IconArrowLeft, IconClose, IconExpand, IconMonitor, IconMore, IconPlus, IconReload } from "./Icons";

type B = { agent: string; url: string; title: string; takenOver: boolean; lastAction: string; idleSecs: number; sandbox: boolean; width: number; height: number };

const SPECIAL = new Set(["Enter", "Tab", "Escape", "Backspace", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", "Delete"]);

function host(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

/** Coluna lateral do chat, como no OpenBot: miniatura de cada navegador; no hover "Abrir" e fechar; clicar abre em tela cheia. */
export function BrowserSide({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<B[] | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [full, setFull] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ browsers: B[]; agents: string[] }>("/api/navegadores");
      setList(r.browsers);
      setAgents(r.agents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, []);

  useEffect(() => {
    void load();
    const a = setInterval(() => void load(), 4000);
    const b = setInterval(() => setTick((t) => t + 1), full ? 1000 : 2500);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [load, full]);

  const act = useCallback(
    async (agent: string, body: Record<string, unknown>) => {
      setError("");
      try {
        await api(`/api/navegadores/${agent}`, { body });
        await load();
        setTick((t) => t + 1);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não deu certo.");
        return false;
      }
    },
    [load],
  );

  const current = full ? list?.find((b) => b.agent === full) : undefined;

  return (
    <aside className="bside" aria-label="Navegador">
      <div className="bside__head">
        <span className="bside__title">
          <IconMonitor size={16} /> Navegador
        </span>
        <span className="rail__spacer" />
        <button type="button" className="icon-btn" title="Abrir um site" aria-label="Abrir um site" onClick={() => setAdding((v) => !v)}>
          <IconPlus size={16} />
        </button>
        {list?.length ? (
          <button type="button" className="icon-btn" title="Tela cheia" aria-label="Tela cheia" onClick={() => setFull(list[0].agent)}>
            <IconExpand size={16} />
          </button>
        ) : null}
        <button type="button" className="icon-btn" title="Fechar painel" aria-label="Fechar painel" onClick={onClose}>
          <IconClose size={16} />
        </button>
      </div>

      {adding ? <OpenForm agents={agents} onOpen={async (agent, url) => (await act(agent, { acao: "abrir", url })) && (setAdding(false), setFull(agent))} /> : null}
      {error ? (
        <p className="notice small" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bside__list">
        {list === null ? (
          <p className="small muted">Carregando…</p>
        ) : list.length ? (
          list.map((b) => (
            <figure className="bthumb" key={b.agent} data-testid={`bthumb-${b.agent}`}>
              <div className="bthumb__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/navegadores/${b.agent}/tela?t=${tick}`} alt={`Tela do navegador de ${b.agent}`} width={b.width} height={b.height} />
                <button type="button" className="bthumb__open" onClick={() => setFull(b.agent)} aria-label={`Abrir o navegador de ${b.agent}`}>
                  <IconExpand size={16} /> Abrir
                </button>
                <button type="button" className="bthumb__x" title="Encerrar este navegador" aria-label={`Encerrar o navegador de ${b.agent}`} onClick={() => void act(b.agent, { acao: "encerrar" })}>
                  <IconClose size={14} />
                </button>
                {b.takenOver ? <span className="bthumb__badge">com você</span> : null}
              </div>
              <figcaption title={b.url}>
                {b.title || host(b.url)} <span className="muted">· {b.agent}</span>
              </figcaption>
            </figure>
          ))
        ) : (
          <p className="small muted bside__empty">
            {agents.length
              ? "Nenhum navegador aberto. Aparece aqui quando um agente abre um site, ou abra um no + para entrar numa conta."
              : 'Nenhum agente com navegador liberado. Ligue em Configurações → Agentes → Editar → "pode usar o navegador".'}
          </p>
        )}
      </div>

      {full && list ? <FullBrowser list={list} current={current} tick={tick} onPick={setFull} onClose={() => setFull(null)} act={act} error={error} /> : null}
    </aside>
  );
}

function OpenForm({ agents, onOpen }: { agents: string[]; onOpen: (agent: string, url: string) => void }) {
  const [who, setWho] = useState(agents[0] ?? "");
  const [url, setUrl] = useState("");
  if (!agents.length) return <p className="small muted">Nenhum agente com navegador liberado.</p>;
  return (
    <form
      className="bside__open"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onOpen(who || agents[0], url.trim());
      }}
    >
      <select className="field field--sm" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Agente do navegador">
        {agents.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <input className="field field--sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="instagram.com" aria-label="Endereço" autoFocus />
      <button className="btn btn--sm">Abrir</button>
    </form>
  );
}

function FullBrowser({
  list,
  current,
  tick,
  onPick,
  onClose,
  act,
  error,
}: {
  list: B[];
  current?: B;
  tick: number;
  onPick: (a: string) => void;
  onClose: () => void;
  act: (agent: string, body: Record<string, unknown>) => Promise<boolean>;
  error: string;
}) {
  const [url, setUrl] = useState(current?.url ?? "");
  const [cookies, setCookies] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setUrl(current?.url ?? "");
  }, [current?.url]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.activeElement !== screenRef.current) onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  if (!current) {
    return (
      <div className="bfull" role="dialog" aria-modal="true" aria-label="Navegador">
        <div className="bfull__tabs">
          <span className="rail__spacer" />
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <p className="muted" style={{ padding: 24 }}>
          Este navegador foi encerrado.
        </p>
      </div>
    );
  }
  const b = current;

  return (
    <div className="bfull" role="dialog" aria-modal="true" aria-label={`Navegador de ${b.agent}`}>
      <div className="bfull__tabs" role="tablist">
        {list.map((t) => (
          <button key={t.agent} type="button" role="tab" aria-selected={t.agent === b.agent} className="bfull__tab" onClick={() => onPick(t.agent)} title={t.url}>
            <span className={`bfull__dot${t.takenOver ? " bfull__dot--you" : ""}`} />
            <span className="bfull__tabtxt">{t.title || host(t.url)}</span>
            <span className="muted small">{t.agent}</span>
          </button>
        ))}
        <span className="rail__spacer" />
        <button type="button" className="icon-btn" aria-label="Fechar tela cheia" title="Fechar (Esc)" onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <form
        className="bfull__bar"
        onSubmit={(e) => {
          e.preventDefault();
          editing.current = false;
          if (url.trim()) void act(b.agent, { acao: b.takenOver ? "navegar" : "abrir", url: url.trim() });
        }}
      >
        <button type="button" className="icon-btn" aria-label="Voltar" title="Voltar" disabled={!b.takenOver} onClick={() => void act(b.agent, { acao: "voltar" })}>
          <IconArrowLeft size={16} />
        </button>
        <button type="button" className="icon-btn" aria-label="Recarregar" title="Recarregar" disabled={!b.takenOver} onClick={() => void act(b.agent, { acao: "navegar", url: b.url })}>
          <IconReload size={16} />
        </button>
        <input
          className="bfull__url"
          value={url}
          onFocus={() => (editing.current = true)}
          onBlur={() => (editing.current = false)}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Endereço"
          spellCheck={false}
        />
        {b.takenOver ? (
          <button type="button" className="btn btn--sm" onClick={() => void act(b.agent, { acao: "devolver" })}>
            Devolver ao agente
          </button>
        ) : (
          <button type="button" className="btn btn--sm btn--on" onClick={() => void act(b.agent, { acao: "assumir" })}>
            Assumir controle
          </button>
        )}
        <details className="pop">
          <summary className="icon-btn" aria-label="Mais opções" title="Mais opções">
            <IconMore />
          </summary>
          <div className="pop__panel">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCookies(true)}>
              Importar cookies
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act(b.agent, { acao: "encerrar" })}>
              Encerrar navegador
            </button>
            <p className="small muted">
              Última ação: {b.lastAction} · parado há {b.idleSecs < 60 ? `${b.idleSecs} s` : `${Math.floor(b.idleSecs / 60)} min`}
              {!b.sandbox ? " · sem o isolamento do Chromium" : ""}
            </p>
          </div>
        </details>
      </form>

      {error ? (
        <p className="notice small bfull__err" role="alert">
          {error}
        </p>
      ) : null}
      {cookies ? (
        <div className="bfull__cookies">
          <CookieForm agent={b.agent} onDone={() => setCookies(false)} />
        </div>
      ) : null}

      <div
        className={`bfull__stage${b.takenOver ? " bfull__stage--live" : ""}`}
        ref={screenRef}
        tabIndex={b.takenOver ? 0 : -1}
        onKeyDown={(e) => {
          if (!b.takenOver || e.ctrlKey || e.metaKey || e.altKey) return;
          if (SPECIAL.has(e.key)) {
            e.preventDefault();
            void act(b.agent, { acao: "tecla", tecla: e.key });
          } else if (e.key.length === 1) {
            e.preventDefault();
            void act(b.agent, { acao: "texto", texto: e.key });
          }
        }}
        onWheel={(e) => {
          if (b.takenOver) void act(b.agent, { acao: "rolar", y: Math.round(e.deltaY) });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/navegadores/${b.agent}/tela?t=${tick}`}
          alt={`Tela do navegador de ${b.agent}`}
          width={b.width}
          height={b.height}
          onClick={(e) => {
            if (!b.takenOver) return;
            screenRef.current?.focus();
            const r = e.currentTarget.getBoundingClientRect();
            void act(b.agent, { acao: "clique", x: Math.round(((e.clientX - r.left) / r.width) * b.width), y: Math.round(((e.clientY - r.top) / r.height) * b.height) });
          }}
        />
        {!b.takenOver ? <p className="bfull__hint small">O agente está no controle. Toque em "Assumir controle" para clicar e digitar.</p> : null}
      </div>
    </div>
  );
}
