"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type B = { agent: string; url: string; title: string; takenOver: boolean; lastAction: string; idleSecs: number; sandbox: boolean; width: number; height: number };

function Card({ b, tick, onChange, onError }: { b: B; tick: number; onChange: () => void; onError: (m: string) => void }) {
  const [typed, setTyped] = useState("");
  const [url, setUrl] = useState("");
  const act = async (body: Record<string, unknown>) => {
    try {
      await api(`/api/navegadores/${b.agent}`, { body });
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Não deu certo.");
    }
  };
  return (
    <li className="browser" data-testid={`navegador-${b.agent}`}>
      <div className="row row--wrap browser__head">
        <strong>{b.agent}</strong>
        <span className="tag">{b.takenOver ? "com você" : "com o agente"}</span>
        <span className="small muted browser__url" title={b.url}>
          {b.url}
        </span>
        <span className="rail__spacer" />
        {b.takenOver ? (
          <button type="button" className="btn btn--sm" onClick={() => void act({ acao: "devolver" })}>
            Devolver ao agente
          </button>
        ) : (
          <button type="button" className="btn btn--sm" onClick={() => void act({ acao: "assumir" })}>
            Assumir controle
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act({ acao: "encerrar" })}>
          Encerrar
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`browser__screen${b.takenOver ? " browser__screen--live" : ""}`}
        src={`/api/navegadores/${b.agent}/tela?t=${tick}`}
        alt={`Tela do navegador de ${b.agent}: ${b.title || b.url}`}
        width={b.width}
        height={b.height}
        onClick={(e) => {
          if (!b.takenOver) return;
          const r = e.currentTarget.getBoundingClientRect();
          void act({ acao: "clique", x: Math.round(((e.clientX - r.left) / r.width) * b.width), y: Math.round(((e.clientY - r.top) / r.height) * b.height) });
        }}
      />
      <p className="small muted">
        {b.title ? `${b.title} · ` : ""}última ação: {b.lastAction} · parado há {b.idleSecs < 60 ? `${b.idleSecs} s` : `${Math.floor(b.idleSecs / 60)} min`}
        {!b.sandbox ? " · sem o isolamento do Chromium (contêiner)" : ""}
      </p>
      {b.takenOver ? (
        <div className="stack">
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) void act({ acao: "navegar", url }).then(() => setUrl(""));
            }}
          >
            <label className="sr-only" htmlFor={`url-${b.agent}`}>
              Endereço
            </label>
            <input id={`url-${b.agent}`} className="field field--sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ir para um endereço…" />
            <button className="btn btn--ghost btn--sm">Ir</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act({ acao: "voltar" })}>
              Voltar
            </button>
          </form>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed) void act({ acao: "texto", texto: typed }).then(() => setTyped(""));
            }}
          >
            <label className="sr-only" htmlFor={`txt-${b.agent}`}>
              Texto para digitar no campo em foco
            </label>
            <input id={`txt-${b.agent}`} className="field field--sm" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="clique num campo da tela e digite aqui (senha não aparece)" />
            <button className="btn btn--ghost btn--sm">Digitar</button>
            {["Enter", "Tab", "Backspace"].map((k) => (
              <button type="button" key={k} className="btn btn--ghost btn--sm" onClick={() => void act({ acao: "tecla", tecla: k })}>
                {k}
              </button>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act({ acao: "rolar", y: 500 })}>
              Rolar ↓
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act({ acao: "rolar", y: -500 })}>
              ↑
            </button>
          </form>
          <p className="small muted">Clique na imagem para clicar na página. O agente espera até você devolver.</p>
        </div>
      ) : null}
    </li>
  );
}

export function BrowsersPanel() {
  const [list, setList] = useState<B[] | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [who, setWho] = useState("");
  const [url, setUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ browsers: B[]; agents: string[] }>("/api/navegadores");
      setList(r.browsers);
      setAgents(r.agents);
      setWho((w) => w || r.agents[0] || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, []);
  useEffect(() => {
    void load();
    const a = setInterval(() => void load(), 4000);
    const b = setInterval(() => setTick((t) => t + 1), 1500);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [load]);

  if (!list) return <p className="muted">{error || "Carregando…"}</p>;
  return (
    <div className="stack stack--lg">
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {agents.length ? (
        <form
          className="row row--wrap"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await api(`/api/navegadores/${who}`, { body: { acao: "abrir", url } });
              setUrl("");
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não abriu.");
            }
          }}
        >
          <label className="sr-only" htmlFor="nav-agente">
            Agente
          </label>
          <select id="nav-agente" className="field field--sm" style={{ width: "auto" }} value={who} onChange={(e) => setWho(e.target.value)}>
            {agents.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="nav-url">
            Endereço
          </label>
          <input id="nav-url" className="field field--sm" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="abrir um site para entrar na conta (ex.: instagram.com)" required />
          <button className="btn btn--sm">Abrir e assumir</button>
        </form>
      ) : (
        <p className="notice">Nenhum agente com navegador liberado. Ligue em Agentes → Editar → "pode usar o navegador da Central".</p>
      )}
      {list.length ? (
        <ul className="browsers">
          {list.map((b) => (
            <Card key={b.agent} b={b} tick={tick} onChange={() => void load()} onError={setError} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum navegador aberto. Ele aparece aqui quando um agente abre um site, ou quando você abre um para entrar numa conta.</p>
      )}
    </div>
  );
}
