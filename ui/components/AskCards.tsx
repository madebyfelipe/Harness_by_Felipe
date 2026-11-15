"use client";

import { useState } from "react";
import { api } from "./api";

export type Ask =
  | { id: string; kind: "pergunta"; pergunta: string; opcoes: string[]; agent: string; status: "pending" | "done" }
  | { id: string; kind: "acesso"; segredo: string; motivo: string; onde: string; agent: string; status: "pending" | "done" };

/** Cartão de pergunta ou de pedido de acesso que um agente abriu no chat. */
export function AskCard({ ask, onError }: { ask: Ask; onError: (m: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(ok: boolean, v = value) {
    setBusy(true);
    try {
      await api(`/api/asks/${ask.id}`, { body: { ok, value: v } });
      setValue("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Não foi possível responder.");
    } finally {
      setBusy(false);
    }
  }

  if (ask.kind === "pergunta") {
    return (
      <form
        className="approval"
        data-testid="ask-pergunta"
        aria-label="Pergunta do agente"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) void send(true);
        }}
      >
        <span className="kicker">Pergunta · {ask.agent}</span>
        <p>
          <strong>{ask.pergunta}</strong>
        </p>
        {ask.opcoes.length ? (
          <div className="row row--wrap">
            {ask.opcoes.map((o) => (
              <button type="button" key={o} className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void send(true, o)}>
                {o}
              </button>
            ))}
          </div>
        ) : null}
        <div className="row">
          <label className="sr-only" htmlFor={`ask-${ask.id}`}>
            Outra resposta
          </label>
          <input id={`ask-${ask.id}`} className="field field--sm" value={value} onChange={(e) => setValue(e.target.value)} placeholder={ask.opcoes.length ? "Outra resposta…" : "Sua resposta…"} />
          <button className="btn btn--sm" disabled={busy || !value.trim()}>
            Responder
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void send(false)}>
            Dispensar
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="approval"
      data-testid="ask-acesso"
      aria-label="Pedido de acesso do agente"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) void send(true);
      }}
    >
      <span className="kicker">Pedido de acesso · {ask.agent}</span>
      <p>
        <strong className="mono">{ask.segredo}</strong>
      </p>
      <p className="small">{ask.motivo}</p>
      {ask.onde ? <p className="small muted">Onde pegar: {ask.onde}</p> : null}
      <div className="row">
        <label className="sr-only" htmlFor={`ask-${ask.id}`}>
          Valor de {ask.segredo}
        </label>
        <input id={`ask-${ask.id}`} className="field field--sm" type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="cole a chave aqui" />
        <button className="btn btn--sm" disabled={busy || !value.trim()}>
          Guardar no cofre
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void send(false)}>
          Agora não
        </button>
      </div>
      <p className="small muted">Vai direto para o cofre da Central, cifrado. O agente não vê o valor e ele não aparece na conversa.</p>
    </form>
  );
}
