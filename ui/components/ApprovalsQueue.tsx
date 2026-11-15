"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconKey, IconReload } from "./Icons";

type Pendente = {
  id: string;
  conversation_id: string;
  run_id: string;
  agent: string;
  tool: string;
  input: string;
  created_at: string;
  conversa: string | null;
};

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const ferramenta = (t: string) => {
  const m = /^mcp__(.+?)__(.+)$/.exec(t);
  return m ? `${m[1]} · ${m[2]}` : t;
};

/** Fila única: todo cartão de aprovação pendente, de qualquer conversa, decide daqui. */
export function ApprovalsQueue() {
  const [lista, setLista] = useState<Pendente[] | null>(null);
  const [erro, setErro] = useState("");
  const [decidindo, setDecidindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await api<{ pending: Pendente[] }>("/api/aprovacoes");
      setLista(r.pending);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não carregou a fila.");
    }
  }, []);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 5000);
    return () => clearInterval(t);
  }, [carregar]);

  async function decidir(id: string, decision: "allow" | "allow_always" | "deny") {
    setDecidindo(id);
    try {
      await api(`/api/approvals/${id}`, { body: { decision } });
      setLista((l) => (l ? l.filter((p) => p.id !== id) : l));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não decidiu.");
      void carregar();
    }
    setDecidindo(null);
  }

  return (
    <div className="stack">
      <div className="row row--between">
        <p className="small muted">
          {lista === null ? "Carregando…" : lista.length ? `${lista.length} pedido(s) esperando` : "Nada esperando aprovação."} A lista atualiza sozinha a cada 5 s.
        </p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void carregar()}>
          <IconReload size={14} /> Atualizar
        </button>
      </div>
      {erro ? (
        <p className="notice small" role="alert">
          {erro}
        </p>
      ) : null}
      {lista?.length ? (
        <ul className="apv__lista">
          {lista.map((p) => (
            <li key={p.id} className="apv__card">
              <div className="apv__top">
                <span className="proj__icon" aria-hidden="true">
                  <IconKey size={16} />
                </span>
                <div className="apv__id">
                  <strong>{ferramenta(p.tool)}</strong>
                  <span className="small muted">
                    {p.agent} · {quando(p.created_at)}
                    {p.conversa ? (
                      <>
                        {" · "}
                        <Link href={`/chat/${p.conversation_id}`}>{p.conversa}</Link>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>
              <code className="apv__sum">{p.input}</code>
              <div className="row">
                <button type="button" className="btn btn--sm btn--on" disabled={decidindo === p.id} onClick={() => void decidir(p.id, "allow")}>
                  Permitir
                </button>
                <button type="button" className="btn btn--sm" disabled={decidindo === p.id} onClick={() => void decidir(p.id, "allow_always")}>
                  Permitir sempre
                </button>
                <button type="button" className="btn btn--sm btn--ghost" disabled={decidindo === p.id} onClick={() => void decidir(p.id, "deny")}>
                  Negar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : lista && !lista.length ? (
        <div className="proj__empty">
          <IconKey size={26} />
          <p>Tudo respondido. Quando um agente pedir permissão, o cartão aparece aqui e no chat.</p>
        </div>
      ) : null}
    </div>
  );
}
