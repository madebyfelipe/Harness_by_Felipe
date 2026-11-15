"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconPlus } from "./Icons";
import { NewChatButton } from "./NewChat";

type Agent = { name: string; description: string; model: string; tools: string[]; prompt: string; paused: boolean; browser: boolean; file: string; protected: boolean; apps: string[] };
type Model = { alias: string; label: string; note: string };
type Draft = { name: string; description: string; model: string; tools: string; prompt: string; paused: boolean; browser: boolean };
const CORES = ["#24292F", "#673DE6", "#0079BF", "#2C7A4B", "#B45309", "#6B21A8", "#0F766E", "#9D174D"];

function Form({ initial, isNew, models, locked, onDone, onCancel }: { initial: Draft; isNew: boolean; models: Model[]; locked: boolean; onDone: (note: string) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="approval"
      data-testid="agente-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await api<{ commit: { commit?: string; pushed: boolean; note?: string } }>("/api/agentes", { body: { ...d, novo: isNew } });
          onDone(`Agente ${d.name} salvo${r.commit.commit ? ` (commit ${r.commit.commit}${r.commit.pushed ? ", enviado" : ""})` : ""}.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não salvou.");
          setBusy(false);
        }
      }}
    >
      <strong>{isNew ? "Novo agente" : `Editar · ${initial.name}`}</strong>
      <div className="form-grid">
        <label className="label">
          Nome (arquivo)
          <input className="field field--sm" name="name" value={d.name} disabled={!isNew} onChange={(e) => set("name", e.target.value)} placeholder="ex.: redator-blog" required pattern="[a-z0-9][a-z0-9\-]{1,39}" />
        </label>
        <label className="label">
          Modelo
          <select className="field field--sm" value={d.model} onChange={(e) => set("model", e.target.value)}>
            {models.map((m) => (
              <option key={m.alias} value={m.alias}>
                {m.label} · {m.note}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="label">
        Papel (quando usar; a triagem lê esta frase para escolher o agente)
        <input className="field field--sm" name="description" value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="ex.: Escreve artigos do blog a partir de um tema. Use depois da pesquisa." />
      </label>
      <label className="label">
        Ferramentas (separadas por vírgula; vazio = todas as do orquestrador)
        <input className="field field--sm mono" name="tools" value={d.tools} onChange={(e) => set("tools", e.target.value)} placeholder="Read, Bash, WebFetch, mcp__Twenty__execute_tool" />
      </label>
      <label className="label">
        Prompt
        <textarea className="field field--sm mono" name="prompt" rows={14} value={d.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="Você é… Faça… Não faça… Pronto quando…" />
      </label>
      <label className="row" style={{ gap: 6 }}>
        <input type="checkbox" checked={d.browser} onChange={(e) => set("browser", e.target.checked)} /> pode usar o navegador da Central
      </label>
      {!locked ? (
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={d.paused} onChange={(e) => set("paused", e.target.checked)} /> pausado (a triagem e o orquestrador não usam)
        </label>
      ) : null}
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
      <p className="small muted">Salva em agents/{d.name || "<nome>"}.md e faz commit. Terminal e escrita de arquivo continuam pedindo sua aprovação no chat.</p>
    </form>
  );
}

const toDraft = (a: Agent): Draft => ({ name: a.name, description: a.description, model: a.model, tools: a.tools.join(", "), prompt: a.prompt, paused: a.paused, browser: a.browser });
const EMPTY: Draft = { name: "", description: "", model: "sonnet", tools: "", prompt: "", paused: false, browser: false };

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [importaveis, setImportaveis] = useState<string[]>([]);
  const [form, setForm] = useState<{ draft: Draft; isNew: boolean; locked: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ agents: Agent[]; models: Model[]; importaveis: string[] }>("/api/agentes");
      setAgents(r.agents);
      setModels(r.models);
      setImportaveis(r.importaveis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const act = async (fn: () => Promise<string>) => {
    setError("");
    setNote("");
    try {
      setNote(await fn());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo.");
    }
  };
  const done = (m: string) => {
    setForm(null);
    setNote(m);
    void load();
  };

  if (!agents) return <p className="muted">{error || "Carregando…"}</p>;
  return (
    <div className="stack stack--lg">
      <div className="toolbar row">
        <button type="button" className="btn btn--sm" onClick={() => setForm({ draft: EMPTY, isNew: true, locked: false })}>
          <IconPlus size={16} /> Novo agente
        </button>
        {importaveis.length ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            title={importaveis.join(", ")}
            onClick={() =>
              void act(async () => {
                const r = await api<{ created: string[] }>("/api/agentes/importar", { method: "POST" });
                return r.created.length ? `Importados como rascunho pausado: ${r.created.join(", ")}. Revise o prompt antes de ligar.` : "Nada novo para importar.";
              })
            }
          >
            Importar do OpenBot ({importaveis.length})
          </button>
        ) : null}
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
      {form?.isNew ? <Form key="novo" initial={form.draft} isNew models={models} locked={false} onDone={done} onCancel={() => setForm(null)} /> : null}
      <ul className="cards">
        {agents.map((a, i) => {
          const editing = form && !form.isNew && form.draft.name === a.name;
          return (
            <li key={a.name} className="card" data-testid={`agente-${a.name}`}>
              <div className="card__row">
                <span className="card__icon" style={{ background: a.paused ? "#5a5a5a" : CORES[i % CORES.length] }} aria-hidden="true">
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <div className="card__text">
                  <span className="card__name">
                    {a.name} <span className="tag">{models.find((m) => m.alias === a.model)?.label ?? a.model}</span>
                    {a.paused ? <span className="tag">pausado</span> : null}
                  </span>
                  <span className="card__desc">{a.description}</span>
                </div>
                {a.paused ? null : <NewChatButton mode="chat" agent={a.name} label="Conversar" ghost small />}
              </div>
              {editing ? (
                <div className="card__detail">
                  <Form key={a.name} initial={form.draft} isNew={false} models={models} locked={form.locked} onDone={done} onCancel={() => setForm(null)} />
                </div>
              ) : (
                <details className="fold card__detail">
                  <summary>Detalhes</summary>
                  <p className="mono small muted">
                    {a.file} · ferramentas: {a.tools.length ? a.tools.join(", ") : "todas"} · apps: {a.apps.length ? a.apps.join(", ") : "nenhum"}
                  </p>
                  <div className="row row--wrap">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({ draft: toDraft(a), isNew: false, locked: a.protected })}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({ draft: { ...toDraft(a), name: `${a.name}-copia`.slice(0, 40), paused: false }, isNew: true, locked: false })}>
                      Duplicar
                    </button>
                    {!a.protected ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            void act(async () => {
                              await api("/api/agentes", { body: { ...toDraft(a), paused: !a.paused } });
                              return a.paused ? `Agente ${a.name} ligado.` : `Agente ${a.name} pausado.`;
                            })
                          }
                        >
                          {a.paused ? "Ligar" : "Pausar"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            if (!window.confirm(`Excluir o agente ${a.name}? O arquivo sai do repositório (dá para recuperar pelo git).`)) return;
                            void act(async () => {
                              await api(`/api/agentes/${a.name}`, { method: "DELETE" });
                              return `Agente ${a.name} excluído.`;
                            });
                          }}
                        >
                          Excluir
                        </button>
                      </>
                    ) : (
                      <span className="small muted">A Central depende deste agente: dá para editar, não pausar nem excluir.</span>
                    )}
                  </div>
                  <pre className="pre">{a.prompt}</pre>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
