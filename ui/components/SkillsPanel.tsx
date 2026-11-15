"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconPlus } from "./Icons";

type Skill = { name: string; titulo: string; description: string; file: string; body: string };
type Draft = { name: string; description: string; body: string };

function Form({ initial, isNew, onDone, onCancel }: { initial: Draft; isNew: boolean; onDone: (note: string) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="approval"
      data-testid="skill-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await api<{ commit: { commit?: string; pushed: boolean } }>("/api/skills", { body: { ...d, novo: isNew } });
          onDone(`Habilidade ${d.name} salva${r.commit.commit ? ` (commit ${r.commit.commit}${r.commit.pushed ? ", enviado" : ""})` : ""}.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não salvou.");
          setBusy(false);
        }
      }}
    >
      <strong>{isNew ? "Nova habilidade" : `Editar · ${initial.name}`}</strong>
      <label className="label">
        Nome (pasta)
        <input className="field field--sm" name="name" value={d.name} disabled={!isNew} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="ex.: proposta-de-site" required pattern="[a-z0-9][a-z0-9\-]{1,39}" />
      </label>
      <label className="label">
        Descrição (quando usar; o agente decide por esta frase)
        <input className="field field--sm" name="description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </label>
      <label className="label">
        Conteúdo (passo a passo)
        <textarea className="field field--sm mono" name="body" rows={14} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
      </label>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <button className="btn btn--sm" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <p className="small muted">Salva em skills/{d.name || "<nome>"}/SKILL.md e faz commit; as versões ficam no histórico do git.</p>
    </form>
  );
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [form, setForm] = useState<{ draft: Draft; isNew: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setSkills((await api<{ skills: Skill[] }>("/api/skills")).skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, []);
  useEffect(() => void load(), [load]);
  const done = (m: string) => {
    setForm(null);
    setNote(m);
    void load();
  };
  if (!skills) return <p className="muted">{error || "Carregando…"}</p>;
  return (
    <div className="stack stack--lg">
      <div className="toolbar row">
        <button type="button" className="btn btn--sm" onClick={() => setForm({ draft: { name: "", description: "", body: "" }, isNew: true })}>
          <IconPlus size={16} /> Nova habilidade
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
      {form?.isNew ? <Form key="nova" initial={form.draft} isNew onDone={done} onCancel={() => setForm(null)} /> : null}
      {skills.length ? (
        <ul className="cards">
          {skills.map((s) => {
            const editing = form && !form.isNew && form.draft.name === s.name;
            return (
              <li key={s.name} className="card" data-testid={`skill-${s.name}`}>
                <div className="card__row">
                  <span className="card__icon" style={{ background: "#454545" }} aria-hidden="true">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="card__text">
                    <span className="card__name">{s.name}</span>
                    <span className="card__desc">{s.description}</span>
                  </div>
                </div>
                {editing ? (
                  <div className="card__detail">
                    <Form key={s.name} initial={form.draft} isNew={false} onDone={done} onCancel={() => setForm(null)} />
                  </div>
                ) : (
                  <details className="fold card__detail">
                    <summary>Conteúdo</summary>
                    <p className="mono small muted">{s.file}</p>
                    <div className="row row--wrap">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({ draft: { name: s.name, description: s.description, body: s.body }, isNew: false })}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={async () => {
                          if (!window.confirm(`Excluir a habilidade ${s.name}? Dá para recuperar pelo git.`)) return;
                          setError("");
                          try {
                            await api(`/api/skills/${s.name}`, { method: "DELETE" });
                            done(`Habilidade ${s.name} excluída.`);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Não excluiu.");
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                    <pre className="pre">{s.body}</pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Nenhuma habilidade em skills/.</p>
      )}
    </div>
  );
}
