"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

type Status = {
  mode: "vps" | "local";
  database: string;
  worker: { id: string; host: string; last_seen_at: string } | null;
  lastWorker: { id: string; last_seen_at: string } | null;
  peer: { url: string; mode: "vps" | "local"; alive: boolean | null } | null;
  running: number;
  modelAuth: string;
};

const NAMES = { vps: "VPS", local: "Local" } as const;
const ABOUT = {
  vps: "Servidor, 24/7: rotinas, disparos, WhatsApp, agentes de madrugada.",
  local: "Seu computador: trabalho do dia, arquivos locais, navegador logado."
} as const;

/** Mostra em qual modo a Central está e se o worker dela está online. */
export function ModeSelector({ initialMode }: { initialMode: "vps" | "local" }) {
  const [status, setStatus] = useState<Status | null>(null);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<Status>("/api/status")
        .then((s) => alive && setStatus(s))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 20_000);
    const onDown = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const mode = status?.mode ?? initialMode;
  const other = mode === "vps" ? "local" : "vps";
  const workerOn = Boolean(status?.worker);

  return (
    <details className="mode" ref={ref}>
      <summary aria-label={`Modo ${NAMES[mode]}, worker ${workerOn ? "online" : "offline"}. Abrir detalhes`}>
        <span className={`dot ${workerOn ? "" : status ? "dot--alert" : "dot--off"}`} aria-hidden="true" />
        Modo {NAMES[mode]}
      </summary>
      <div className="mode__panel">
        <div className="mode__opt" aria-current="true">
          <span className="dot" aria-hidden="true" />
          <div>
            <strong>{NAMES[mode]} · você está aqui</strong>
            <p className="small muted">{ABOUT[mode]}</p>
          </div>
        </div>
        {status?.peer ? (
          <a className="mode__opt" href={status.peer.url}>
            <span className={`dot ${status.peer.alive ? "" : "dot--off"}`} aria-hidden="true" />
            <div>
              <strong>
                {NAMES[other]} · {status.peer.alive ? "no ar, abrir" : "sem resposta"}
              </strong>
              <p className="small muted">{ABOUT[other]}</p>
            </div>
          </a>
        ) : (
          <div className="mode__opt">
            <span className="dot dot--off" aria-hidden="true" />
            <div>
              <strong>{NAMES[other]} · não ligado</strong>
              <p className="small muted">Defina CENTRAL_PEER_URL para trocar de modo por aqui.</p>
            </div>
          </div>
        )}
        <hr className="rule" />
        <dl className="stack small" style={{ margin: 0 }}>
          <div className="row row--between">
            <dt className="muted">Worker</dt>
            <dd style={{ margin: 0 }}>{status ? (workerOn ? `online · ${status.worker!.id}` : "offline") : "…"}</dd>
          </div>
          <div className="row row--between">
            <dt className="muted">Execuções agora</dt>
            <dd style={{ margin: 0 }}>{status?.running ?? "…"}</dd>
          </div>
          <div className="row row--between">
            <dt className="muted">Modelo via</dt>
            <dd style={{ margin: 0 }}>{status?.modelAuth ?? "…"}</dd>
          </div>
          <div className="row row--between">
            <dt className="muted">Banco</dt>
            <dd style={{ margin: 0 }}>{status?.database ?? "…"}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
