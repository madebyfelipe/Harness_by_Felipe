"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconPlus } from "./Icons";

type Secret = { name: string; updated_at: string; last_used_at: string | null; agents: string[] | null; apps: string[] };
type Use = { name: string; agent: string; onde: string; used_at: string };
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca");

function Scope({ agents, value, onChange }: { agents: string[]; value: string[] | null; onChange: (v: string[] | null) => void }) {
  const all = value === null;
  return (
    <fieldset className="row row--wrap" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
      <legend className="label">Quem pode usar</legend>
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={all} onChange={(e) => onChange(e.target.checked ? null : [])} /> todos os agentes
      </label>
      {!all
        ? agents.map((a) => (
            <label className="row small" style={{ gap: 6 }} key={a}>
              <input type="checkbox" checked={value.includes(a)} onChange={(e) => onChange(e.target.checked ? [...value, a] : value.filter((x) => x !== a))} /> {a}
            </label>
          ))
        : null}
    </fieldset>
  );
}

export function VaultPanel() {
  const [data, setData] = useState<{ secrets: Secret[]; uses: Use[]; agents: string[] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; value: string; agents: string[] | null }>({ name: "", value: "", agents: null });
  const [edit, setEdit] = useState<{ name: string; value: string; agents: string[] | null } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api("/api/cofre"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const run = async (fn: () => Promise<string>) => {
    setError("");
    setNote("");
    try {
      setNote(await fn());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo.");
    }
  };

  if (!data) return <p className="muted">{error || "Carregando…"}</p>;
  return (
    <div className="stack stack--lg">
      <div className="toolbar row">
        <button type="button" className="btn btn--sm" onClick={() => setAdding((a) => !a)}>
          <IconPlus size={16} /> Novo segredo
        </button>
      </div>
      {note ? (
        <p className="notice" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {adding ? (
        <form
          className="approval"
          data-testid="cofre-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api("/api/cofre", { body: { name: draft.name, value: draft.value, agents: draft.agents ?? ["*"] } });
              setDraft({ name: "", value: "", agents: null });
              setAdding(false);
              return `Segredo ${draft.name} guardado.`;
            });
          }}
        >
          <strong>Novo segredo</strong>
          <div className="form-grid">
            <label className="label">
              Nome
              <input className="field field--sm mono" name="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} placeholder="APIFY_TOKEN" required pattern="[A-Z][A-Z0-9_]{2,63}" />
            </label>
            <label className="label">
              Valor
              <input className="field field--sm" name="value" type="password" autoComplete="off" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} required />
            </label>
          </div>
          <Scope agents={data.agents} value={draft.agents} onChange={(v) => setDraft({ ...draft, agents: v })} />
          <div className="row">
            <button className="btn btn--sm">Guardar</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {data.secrets.length ? (
        <ul className="cards cards--one">
          {data.secrets.map((s) => (
            <li key={s.name} className="card" data-testid={`segredo-${s.name}`}>
              <div className="card__row">
                <span className="card__icon" style={{ background: "#454545" }} aria-hidden="true">
                  •
                </span>
                <div className="card__text">
                  <span className="card__name mono">{s.name}</span>
                  <span className="card__desc">
                    {s.agents ? `só ${s.agents.join(", ")}` : "todos os agentes"} · {s.apps.length ? `usado por ${s.apps.join(", ")}` : "nenhum app usa"} · trocado em {when(s.updated_at)} · último uso: {when(s.last_used_at)}
                  </span>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEdit(edit?.name === s.name ? null : { name: s.name, value: "", agents: s.agents })}>
                  {edit?.name === s.name ? "Fechar" : "Configurar"}
                </button>
              </div>
              {edit?.name === s.name ? (
                <form
                  className="card__detail stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if (edit.value.trim()) await api("/api/cofre", { body: { name: s.name, value: edit.value, agents: edit.agents ?? ["*"] } });
                      else await api(`/api/cofre/${s.name}`, { body: { agents: edit.agents ?? ["*"] } });
                      setEdit(null);
                      return `Segredo ${s.name} atualizado.`;
                    });
                  }}
                >
                  <Scope agents={data.agents} value={edit.agents} onChange={(v) => setEdit({ ...edit, agents: v })} />
                  <label className="label">
                    Trocar o valor (deixe vazio para manter)
                    <input className="field field--sm" type="password" autoComplete="off" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} placeholder="guardado · cole para trocar" />
                  </label>
                  <div className="row">
                    <button className="btn btn--sm">Salvar</button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        if (!window.confirm(`Apagar o segredo ${s.name}? Os apps que usam param de funcionar.`)) return;
                        void run(async () => {
                          await api(`/api/cofre/${s.name}`, { method: "DELETE" });
                          setEdit(null);
                          return `Segredo ${s.name} apagado.`;
                        });
                      }}
                    >
                      Apagar
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum segredo guardado. Os agentes pedem pelo chat quando precisam, ou você adiciona aqui.</p>
      )}

      <section className="stack">
        <h2 className="h2">Registro de uso</h2>
        {data.uses.length ? (
          <ul className="list">
            {data.uses.map((u, i) => (
              <li className="list__item" key={i}>
                <span className="small">
                  <strong className="mono">{u.name}</strong> · {u.agent} · {when(u.used_at)}
                </span>
                <span className="small muted">{u.onde}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Ainda sem uso por referência. Aparece aqui quando um agente usa {"{{vault:NOME}}"} num comando ou no navegador.</p>
        )}
      </section>
    </div>
  );
}
