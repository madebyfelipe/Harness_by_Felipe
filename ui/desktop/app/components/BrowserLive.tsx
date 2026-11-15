"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type B = { agent: string; url: string; title: string; takenOver: boolean; lastAction: string; idleSecs: number; sandbox: boolean; width: number; height: number };

/** Navegador por agente embutido no chat: tela ao vivo, controle e importação de cookies. */
export function BrowserLive() {
  const [list, setList] = useState<B[] | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [who, setWho] = useState("");
  const [url, setUrl] = useState("");
  const [openCookie, setOpenCookie] = useState<string | null>(null);

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

  const act = async (agent: string, body: Record<string, unknown>) => {
    setError("");
    try {
      await api(`/api/navegadores/${agent}`, { body });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo.");
    }
  };

  return (
    <div className="stack stack--lg browser-live">
      <div className="row row--wrap" style={{ gap: 6 }}>
        {agents.length ? (
          <>
            <select className="field field--sm" style={{ width: "auto" }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Agente do navegador">
              {agents.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <input className="field field--sm" style={{ flex: 1, minWidth: 160 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="abrir um site (ex.: instagram.com)" />
            <button
              className="btn btn--sm"
              onClick={() => {
                if (!url.trim()) return;
                void act(who, { acao: "abrir", url }).then(() => setUrl(""));
              }}
            >
              Abrir e assumir
            </button>
          </>
        ) : (
          <p className="small muted">Nenhum agente com o navegador liberado. Ligue em Configurações → Agentes → Editar → "pode usar o navegador da Central".</p>
        )}
      </div>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}

      {list && list.length ? (
        <ul className="browsers" style={{ gap: 16 }}>
          {list.map((b) => (
            <li className="browser" key={b.agent} data-testid={`navegador-${b.agent}`}>
              <div className="row row--wrap browser__head">
                <strong>{b.agent}</strong>
                <span className="tag">{b.takenOver ? "com você" : "com o agente"}</span>
                <span className="small muted browser__url" title={b.url}>
                  {b.url}
                </span>
                <span className="rail__spacer" />
                {b.takenOver ? (
                  <button type="button" className="btn btn--sm" onClick={() => void act(b.agent, { acao: "devolver" })}>
                    Devolver
                  </button>
                ) : (
                  <button type="button" className="btn btn--sm" onClick={() => void act(b.agent, { acao: "assumir" })}>
                    Assumir controle
                  </button>
                )}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act(b.agent, { acao: "encerrar" })}>
                  Encerrar
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`browser__screen${b.takenOver ? " browser__screen--live" : ""}`}
                src={`/api/navegadores/${b.agent}/tela?t=${tick}`}
                alt={`Tela do navegador de ${b.agent}`}
                width={b.width}
                height={b.height}
                onClick={(e) => {
                  if (!b.takenOver) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  void act(b.agent, { acao: "clique", x: Math.round(((e.clientX - r.left) / r.width) * b.width), y: Math.round(((e.clientY - r.top) / r.height) * b.height) });
                }}
              />
              <p className="small muted">
                {b.title ? `${b.title} · ` : ""}última ação: {b.lastAction} · parado há {b.idleSecs < 60 ? `${b.idleSecs} s` : `${Math.floor(b.idleSecs / 60)} min`}
                {!b.sandbox ? " · sem o isolamento do Chromium (contêiner)" : ""}
              </p>
              {b.takenOver ? (
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get("navurl") as string;
                    if (v.trim()) void act(b.agent, { acao: "navegar", url: v });
                  }}
                >
                  <input className="field field--sm" style={{ flex: 1 }} name="navurl" placeholder="ir para um endereço…" />
                  <button className="btn btn--ghost btn--sm">Ir</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act(b.agent, { acao: "voltar" })}>
                    Voltar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void act(b.agent, { acao: "rolar", y: 500 })}>
                    Rolar ↓
                  </button>
                </form>
              ) : null}
              {openCookie === b.agent ? (
                <CookieForm
                  agent={b.agent}
                  onDone={(msg) => {
                    setError("");
                    setOpenCookie(null);
                    if (msg) setError(msg);
                    void load();
                  }}
                />
              ) : (
                <button type="button" className="link small" style={{ justifySelf: "start", background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setOpenCookie(b.agent)}>
                  Importar cookies (para entrar já logado)
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : list ? (
        <p className="small muted">Nenhum navegador aberto. Ele aparece aqui quando um agente abre um site, ou quando você abre um acima para entrar numa conta.</p>
      ) : (
        <p className="muted">Carregando…</p>
      )}
    </div>
  );
}

export function CookieForm({ agent, onDone }: { agent: string; onDone: (msg?: string) => void }) {
  const [cookies, setCookies] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        try {
          const r = await api<{ ok: boolean; count: number; domains: string[] }>(`/api/navegadores/${agent}`, { body: { acao: "importar-cookies", cookies } });
          setCookies("");
          onDone(`${r.count} cookies importados para ${r.domains.join(", ")}.`);
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Não importou.");
          setBusy(false);
        }
      }}
    >
      <p className="small muted">
        Cole aqui os cookies exportados do seu navegador (formato <code>cookies.txt</code> do Netscape ou um JSON com <code>name</code>, <code>value</code>,{" "}
        <code>domain</code>, <code>path</code>). Eles vão para o perfil de <strong>{agent}</strong>, ficam guardados na Central e nunca aparecem na conversa nem no repositório.
      </p>
      <textarea className="field" rows={5} value={cookies} onChange={(e) => setCookies(e.target.value)} placeholder={'{"name":"sessionid","value":"…","domain":".exemplo.com","path":"/"}'} />
      <div className="row">
        <button className="btn btn--sm" disabled={busy || !cookies.trim()}>
          {busy ? "Importando…" : "Importar"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDone()}>
          Cancelar
        </button>
      </div>
      {msg ? <p className="small">{msg}</p> : null}
    </form>
  );
}
