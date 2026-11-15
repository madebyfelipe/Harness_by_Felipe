"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconReload, IconTool } from "./Icons";

type Run = {
  id: string;
  conversation_id: string | null;
  conversa: string | null;
  agent: string;
  model: string;
  origin: string;
  status: string;
  input: string;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  num_turns: number | null;
  duration_ms: number | null;
  started_at: string;
  ended_at: string | null;
  error: string | null;
};
type Aprovacao = { id: string; conversation_id: string; agent: string; tool: string; input: string; status: string; created_at: string; decided_at: string | null; conversa: string | null };
type Auditoria = { id: string; created_at: string; actor: string; action: string; detail: string | null };
type Dados = { runs: Run[]; aprovacoes: Aprovacao[]; auditoria: Auditoria[] };

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dinheiro = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(v));
const numero = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v));
const duracao = (ms: number | null) => {
  if (ms == null) return "—";
  return ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 60_000).toFixed(1)} min`;
};

const STATUS: Record<string, string> = { running: "rodando", done: "concluída", error: "erro", stopped: "parada" };
const DECISAO: Record<string, string> = { pending: "esperando", auto: "automática", approved: "permitida", denied: "negada", expired: "expirada" };

type Aba = "runs" | "aprovacoes" | "auditoria";

/** Registros: execuções (modelo, custo, tokens), decisões de aprovação e auditoria. */
export function RecordsView() {
  const [aba, setAba] = useState<Aba>("runs");
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api<Dados>("/api/registros?limite=80");
      setDados(r);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não carregou.");
    }
    setCarregando(false);
  }, []);

  useEffect(() => void carregar(), [carregar]);

  return (
    <div className="stack">
      <div className="row row--between">
        <div className="row">
          <button type="button" className={`btn btn--sm${aba === "runs" ? " btn--on" : " btn--ghost"}`} onClick={() => setAba("runs")}>
            Execuções {dados ? `(${dados.runs.length})` : ""}
          </button>
          <button type="button" className={`btn btn--sm${aba === "aprovacoes" ? " btn--on" : " btn--ghost"}`} onClick={() => setAba("aprovacoes")}>
            Aprovações {dados ? `(${dados.aprovacoes.length})` : ""}
          </button>
          <button type="button" className={`btn btn--sm${aba === "auditoria" ? " btn--on" : " btn--ghost"}`} onClick={() => setAba("auditoria")}>
            Auditoria {dados ? `(${dados.auditoria.length})` : ""}
          </button>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void carregar()} disabled={carregando}>
          <IconReload size={14} /> {carregando ? "Carregando…" : "Atualizar"}
        </button>
      </div>
      {erro ? (
        <p className="notice small" role="alert">
          {erro}
        </p>
      ) : null}

      {dados === null ? (
        <p className="muted small">Carregando…</p>
      ) : aba === "runs" ? (
        dados.runs.length ? (
          <ul className="reg__lista">
            {dados.runs.map((r) => (
              <li key={r.id} className="reg__row">
                <span className={`reg__status reg__status--${r.status}`}>{STATUS[r.status] ?? r.status}</span>
                <div className="reg__main">
                  <strong>{r.agent}</strong>
                  <span className="small muted">
                    {r.model} · {r.origin}
                    {r.conversa ? (
                      <>
                        {" · "}
                        <Link href={`/chat/${r.conversation_id}`}>{r.conversa}</Link>
                      </>
                    ) : null}
                  </span>
                  <span className="small muted reg__input">{r.input}</span>
                  {r.error ? <span className="small reg__erro">{r.error.slice(0, 180)}</span> : null}
                </div>
                <div className="reg__meta">
                  <span>{quando(r.started_at)}</span>
                  <span className="small muted">
                    {dinheiro(r.cost_usd)} · {numero((r.input_tokens ?? 0) + (r.output_tokens ?? 0))} tokens · {duracao(r.duration_ms)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Nenhuma execução registrada ainda.</p>
        )
      ) : aba === "aprovacoes" ? (
        dados.aprovacoes.length ? (
          <ul className="reg__lista">
            {dados.aprovacoes.map((a) => (
              <li key={a.id} className="reg__row">
                <span className={`reg__status reg__status--${a.status === "approved" || a.status === "auto" ? "done" : a.status === "denied" ? "error" : "pending"}`}>{DECISAO[a.status] ?? a.status}</span>
                <div className="reg__main">
                  <strong>{a.tool}</strong>
                  <span className="small muted">
                    {a.agent}
                    {a.conversa ? (
                      <>
                        {" · "}
                        <Link href={`/chat/${a.conversation_id}`}>{a.conversa}</Link>
                      </>
                    ) : null}
                  </span>
                  <span className="small muted reg__input">{a.input}</span>
                </div>
                <div className="reg__meta">
                  <span>{quando(a.created_at)}</span>
                  <span className="small muted">{a.decided_at ? `decidida ${quando(a.decided_at)}` : "sem decisão"}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Nenhuma aprovação registrada ainda.</p>
        )
      ) : dados.auditoria.length ? (
        <ul className="reg__lista">
          {dados.auditoria.map((a) => (
            <li key={a.id} className="reg__row">
              <span className="reg__status reg__status--auto">
                <IconTool size={14} />
              </span>
              <div className="reg__main">
                <strong>{a.action}</strong>
                <span className="small muted">{a.detail ?? "—"}</span>
              </div>
              <div className="reg__meta">
                <span>{quando(a.created_at)}</span>
                <span className="small muted">{a.actor}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Nenhum registro de auditoria ainda.</p>
      )}
    </div>
  );
}
