"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconClock, IconPlus } from "./Icons";

type Run = { id: string; rotina: string; origem: string; conversation_id: string | null; status: string; resumo: string | null; erro: string | null; avisado: number; started_at: string; ended_at: string | null };
type Routine = {
  nome: string;
  titulo: string;
  quando: string;
  cron: string;
  agente: string;
  modo: "vps" | "local" | "ambos";
  ativa: boolean;
  silencio: boolean;
  whatsapp: boolean;
  limite_minutos: number;
  liberadas: string[];
  instrucoes: string;
  aqui: boolean;
  proximas: string[];
  abreJanela: boolean;
  ultima: Run | null;
};

const when = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const STATUS: Record<string, string> = { ok: "ok", silencio: "nada a reportar", rodando: "rodando", error: "erro", stopped: "parada (limite de tempo)" };
const EMPTY: Omit<Routine, "aqui" | "proximas" | "abreJanela" | "ultima"> = {
  nome: "",
  titulo: "",
  quando: "dias úteis às 07:30",
  cron: "",
  agente: "auto",
  modo: "vps",
  ativa: true,
  silencio: true,
  whatsapp: true,
  limite_minutos: 30,
  liberadas: [],
  instrucoes: ""
};

function Editor({ initial, agents, onSaved, onCancel }: { initial: typeof EMPTY; agents: string[]; onSaved: () => void; onCancel: () => void }) {
  const [r, setR] = useState(initial);
  const [prev, setPrev] = useState<{ texto: string; proximas: string[]; abreJanela: boolean } | null>(null);
  const [prevErr, setPrevErr] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isNew = !initial.nome;

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setPrev(await api("/api/rotinas/previa", { body: { quando: r.quando } }));
        setPrevErr("");
      } catch (e) {
        setPrev(null);
        setPrevErr(e instanceof Error ? e.message : "Não entendi.");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [r.quando]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setR((x) => ({ ...x, [k]: v }));
  const toggleTool = (t: string) => set("liberadas", r.liberadas.includes(t) ? r.liberadas.filter((x) => x !== t) : [...r.liberadas, t]);

  return (
    <form
      className="approval"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
          await api("/api/rotinas", { body: r });
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não salvou.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <strong>{isNew ? "Nova rotina" : `Editar · ${initial.titulo}`}</strong>
      <div className="form-grid">
        <label className="label">
          Nome (arquivo)
          <input className="field field--sm" value={r.nome} disabled={!isNew} onChange={(e) => set("nome", e.target.value)} placeholder="ex.: briefing-comercial" required pattern="[a-z0-9][a-z0-9\-]{1,49}" />
        </label>
        <label className="label">
          Título
          <input className="field field--sm" value={r.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="ex.: Briefing comercial" />
        </label>
        <label className="label">
          Quando (em português)
          <input className="field field--sm" value={r.quando} onChange={(e) => set("quando", e.target.value)} placeholder="dias úteis às 05:30 · segunda às 8h · a cada 2 horas" />
        </label>
        <label className="label">
          Agente
          <select className="field field--sm" value={r.agente} onChange={(e) => set("agente", e.target.value)}>
            <option value="auto">Triagem decide</option>
            <option value="ping">Só abrir a janela de uso (sem IA de verdade)</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Onde roda
          <select className="field field--sm" value={r.modo} onChange={(e) => set("modo", e.target.value as typeof r.modo)}>
            <option value="vps">Só na VPS</option>
            <option value="local">Só no local</option>
            <option value="ambos">Nas duas</option>
          </select>
        </label>
        <label className="label">
          Limite de tempo (min)
          <input className="field field--sm" type="number" min={2} max={240} value={r.limite_minutos} onChange={(e) => set("limite_minutos", Number(e.target.value))} />
        </label>
      </div>
      <p className="small" aria-live="polite">
        {prevErr ? <span className="notice">{prevErr}</span> : prev ? `${prev.texto} · próximas: ${prev.proximas.join(" · ")}` : "…"}
        {prev?.abreJanela ? <span className="notice"> Roda antes das 05:30: abre a janela de uso da assinatura antes do reset.</span> : null}
      </p>
      <div className="row" style={{ gap: 16 }}>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={r.ativa} onChange={(e) => set("ativa", e.target.checked)} /> ligada
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={r.silencio} onChange={(e) => set("silencio", e.target.checked)} /> se nada aconteceu, não avise
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={r.whatsapp} onChange={(e) => set("whatsapp", e.target.checked)} /> avisar no WhatsApp
        </label>
      </div>
      <fieldset className="row" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
        <legend className="label">Pode usar sem pedir aprovação (autorização por escrito)</legend>
        {["Edit", "Write", "Bash"].map((t) => (
          <label key={t} className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={r.liberadas.includes(t)} onChange={() => toggleTool(t)} /> {t === "Bash" ? "terminal" : t === "Edit" ? "editar arquivo" : "criar arquivo"}
          </label>
        ))}
      </fieldset>
      <label className="label">
        Instruções (autocontidas: quem lê não vê o chat)
        <textarea className="field" rows={7} value={r.instrucoes} onChange={(e) => set("instrucoes", e.target.value)} required minLength={10} />
      </label>
      {error ? <p className="notice">{error}</p> : null}
      <div className="row">
        <button className="btn btn--sm" disabled={saving}>
          {saving ? "Salvando…" : "Salvar e fazer commit"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RoutinesPanel({ agents }: { agents: string[] }) {
  const [list, setList] = useState<Routine[] | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ routines: Routine[]; history: Run[]; errors: { file: string; error: string }[] }>("/api/rotinas");
    setList(r.routines);
    setHistory(r.history);
    setErrors(r.errors);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Não carregou."));
  }, [load]);

  async function act(nome: string, fn: () => Promise<unknown>) {
    setBusy(nome);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="stack stack--lg">
      <div className="toolbar">
        <p className="muted">Agenda em Brasília. Cada execução vira uma conversa "Rotina · …" e, se ligado, um aviso de até 3 linhas no WhatsApp.</p>
        <button type="button" className="btn btn--light" onClick={() => setEditing({ ...EMPTY })}>
          <IconPlus size={16} /> Nova rotina
        </button>
      </div>
      {editing ? (
        <Editor
          initial={editing}
          agents={agents}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
      {error ? <p className="notice">{error}</p> : null}
      {errors.map((e) => (
        <p className="notice" key={e.file}>
          <span className="mono">{e.file}</span>: {e.error}
        </p>
      ))}
      {list === null ? <p className="muted">Carregando…</p> : null}
      <ul className="cards cards--one">
        {(list ?? []).map((r) => (
          <li key={r.nome} className="card" data-testid={`rotina-${r.nome}`}>
            <div className="card__row">
              <span className="card__icon" style={{ background: r.ativa ? "var(--red)" : "var(--gray-500)" }} aria-hidden="true">
                <IconClock size={20} />
              </span>
              <div className="card__text">
                <span className="card__name">
                  {r.titulo} {!r.ativa ? <span className="tag">desligada</span> : null} {!r.aqui ? <span className="tag">{r.modo === "local" ? "só local" : "só VPS"}</span> : null}
                </span>
                <span className="card__desc">
                  {r.quando}
                  {r.ativa && r.proximas[0] ? ` · próxima ${r.proximas[0]}` : ""}
                  {r.ultima ? ` · última: ${STATUS[r.ultima.status] ?? r.ultima.status} (${when(r.ultima.started_at)})` : ""}
                </span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy !== ""} onClick={() => void act(r.nome, () => api(`/api/rotinas/${r.nome}/rodar`, { method: "POST" }))}>
                  {busy === r.nome ? "…" : "Rodar agora"}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy !== ""} onClick={() => void act(r.nome, () => api(`/api/rotinas/${r.nome}`, { method: "PATCH", body: { ativa: !r.ativa } }))}>
                  {r.ativa ? "Pausar" : "Ligar"}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing({ ...EMPTY, ...r })}>
                  Editar
                </button>
              </div>
            </div>
            {r.abreJanela ? <p className="notice card__detail">Roda antes das 05:30: abre a janela de uso da assinatura antes do reset.</p> : null}
            {r.ultima?.resumo || r.ultima?.erro ? (
              <p className="small muted card__detail">
                {r.ultima.erro ? `Erro: ${r.ultima.erro}` : r.ultima.resumo}{" "}
                {r.ultima.conversation_id ? (
                  <a className="link" href={`/chat/${r.ultima.conversation_id}`}>
                    abrir
                  </a>
                ) : null}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="stack">
        <h2 className="cat__head">Histórico</h2>
        {history.length ? (
          <ul className="list">
            {history.map((h) => (
              <li key={h.id}>
                <div className="list__item">
                  <span className="small">
                    <strong>{h.rotina}</strong> · {when(h.started_at)} · {h.origem === "manual" ? "rodada por você" : "agenda"} · {STATUS[h.status] ?? h.status}
                    {h.avisado ? " · avisado no WhatsApp" : ""}
                    {h.conversation_id ? (
                      <>
                        {" · "}
                        <a className="link" href={`/chat/${h.conversation_id}`}>
                          conversa
                        </a>
                      </>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nenhuma execução ainda.</p>
        )}
      </section>
    </div>
  );
}
