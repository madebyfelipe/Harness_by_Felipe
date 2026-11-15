"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Step = { nome: string; ok: boolean; detalhe: string };
type Connector = {
  nome: string;
  titulo: string;
  tipo: string;
  prioridade: number;
  uso: string;
  endpoint: string;
  segredo: string;
  agentes: string[];
  mcp?: { nome: string; url: string; transporte: string };
  file: string;
  secretState: "nao_usa" | "definido" | "ausente";
  status: { ok: number; detail: string; latency_ms: number | null; checked_at: string } | null;
};

const when = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function ConnectorsPanel({ agents }: { agents: string[] }) {
  const [list, setList] = useState<Connector[] | null>(null);
  const [fileErrors, setFileErrors] = useState<{ file: string; error: string }[]>([]);
  const [testing, setTesting] = useState<string>("");
  const [results, setResults] = useState<Record<string, Step[]>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ connectors: Connector[]; errors: { file: string; error: string }[] }>("/api/conectores");
      setList(r.connectors);
      setFileErrors(r.errors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function test(nome: string) {
    setTesting(nome);
    setError("");
    try {
      const r = await api<{ result: { steps: Step[] } }>(`/api/conectores/${nome}/testar`, { method: "POST" });
      setResults((x) => ({ ...x, [nome]: r.result.steps }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O teste falhou.");
    } finally {
      setTesting("");
    }
  }

  async function add(form: HTMLFormElement) {
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setNote("");
    try {
      const picked = data.getAll("agentes").map(String);
      const r = await api<{ commit: { committed: boolean; commit?: string; pushed: boolean; note?: string } }>("/api/conectores", {
        body: {
          nome: data.get("nome"),
          titulo: data.get("titulo"),
          url: data.get("url"),
          transporte: data.get("transporte"),
          segredo: data.get("segredo"),
          uso: data.get("uso"),
          agentes: picked.length ? picked : ["*"]
        }
      });
      const c = r.commit;
      setNote(c.committed ? `Salvo no repositório (commit ${c.commit}${c.pushed ? ", enviado" : `, não enviado: ${c.note}`}).` : `Arquivo gravado, sem commit: ${c.note}`);
      form.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(nome: string) {
    if (!window.confirm(`Remover o conector "${nome}"? O arquivo sai do repositório (fica no histórico do git).`)) return;
    setError("");
    try {
      await api(`/api/conectores/${nome}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="stack stack--lg">
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {fileErrors.map((f) => (
        <p className="notice" role="alert" key={f.file}>
          <span className="mono">{f.file}</span>: {f.error}
        </p>
      ))}

      {list === null ? (
        <p className="muted">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="muted">Nenhum arquivo em connectors/.</p>
      ) : (
        <ul className="list">
          {list.map((c) => {
            const steps = results[c.nome];
            const state = !c.status ? "nunca testado" : c.status.ok ? "funcionando" : "com problema";
            return (
              <li key={c.nome} data-testid={`conector-${c.nome}`}>
                <div className="list__item">
                  <div className="row row--between">
                    <div className="row">
                      <span className={`dot ${!c.status ? "dot--off" : c.status.ok ? "" : "dot--alert"}`} aria-hidden="true" />
                      <span className="list__title">{c.titulo}</span>
                      <span className="tag">{c.tipo}</span>
                      <span className="tag">prioridade {c.prioridade}</span>
                    </div>
                    <div className="row">
                      <button type="button" className="btn btn--ghost btn--sm" disabled={testing !== ""} onClick={() => void test(c.nome)}>
                        {testing === c.nome ? "Testando…" : "Testar"}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove(c.nome)}>
                        Remover
                      </button>
                    </div>
                  </div>
                  {c.uso ? <p className="muted">{c.uso}</p> : null}
                  <p className="small">
                    <strong>{state}</strong>
                    {c.status ? ` · ${c.status.detail} · ${when(c.status.checked_at)}` : ""}
                  </p>
                  <p className="mono muted">
                    {c.file} · segredo: {c.secretState === "nao_usa" ? "não usa" : `${c.segredo} (${c.secretState})`} · agentes: {c.agentes.includes("*") ? "todos" : c.agentes.join(", ")}
                    {c.mcp ? ` · mcp__${c.mcp.nome}__*` : ""}
                  </p>
                  {steps ? (
                    <ul className="steps" aria-label="Resultado do teste">
                      {steps.map((s) => (
                        <li key={s.nome}>
                          <b>{s.ok ? "ok" : "falhou"}</b> {s.nome}: {s.detalhe}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="stack" aria-labelledby="novo-mcp">
        <h2 className="h2" id="novo-mcp">
          Adicionar servidor MCP
        </h2>
        <p className="muted">
          Grava <span className="mono">connectors/&lt;nome&gt;.yaml</span> e faz commit. O segredo não entra aqui: informe só o nome da variável; o valor fica em <span className="mono">~/.central/env</span>.
        </p>
        <form
          className="form"
          style={{ maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            void add(e.currentTarget);
          }}
        >
          <div>
            <label className="label" htmlFor="c-nome">
              Nome (minúsculas e hífen)
            </label>
            <input className="field" id="c-nome" name="nome" pattern="[a-z0-9][a-z0-9\-]{1,39}" placeholder="ex.: magnific" required />
          </div>
          <div>
            <label className="label" htmlFor="c-titulo">
              Título
            </label>
            <input className="field" id="c-titulo" name="titulo" placeholder="ex.: Magnific (fotos de banco)" />
          </div>
          <div>
            <label className="label" htmlFor="c-url">
              URL do servidor MCP (https)
            </label>
            <input className="field" id="c-url" name="url" type="url" placeholder="https://…/mcp" required />
          </div>
          <div>
            <label className="label" htmlFor="c-transporte">
              Transporte
            </label>
            <select className="field" id="c-transporte" name="transporte" defaultValue="http">
              <option value="http">HTTP (padrão atual)</option>
              <option value="sse">SSE (servidores antigos)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-segredo">
              Nome do segredo (opcional)
            </label>
            <input className="field" id="c-segredo" name="segredo" pattern="[A-Z][A-Z0-9_]{2,63}" placeholder="ex.: MAGNIFIC_KEY" autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="c-uso">
              Para que serve (opcional)
            </label>
            <input className="field" id="c-uso" name="uso" maxLength={300} />
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label">Agentes que podem usar (nenhum marcado = todos)</legend>
            <div className="row">
              {agents.map((a) => (
                <label key={a} className="tag" style={{ cursor: "pointer" }}>
                  <input type="checkbox" name="agentes" value={a} /> {a}
                </label>
              ))}
            </div>
          </fieldset>
          {note ? <p className="notice notice--plain">{note}</p> : null}
          <button className="btn" disabled={saving}>
            {saving ? "Salvando…" : "Salvar e fazer commit"}
          </button>
        </form>
      </section>
    </div>
  );
}
