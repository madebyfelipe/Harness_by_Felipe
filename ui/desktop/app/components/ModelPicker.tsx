"use client";

import { useEffect, useRef, useState } from "react";

type ModelOpt = { id: string; label: string; note: string };
type ProviderOpt = { id: string; kind: string; name: string; info: { loggedIn?: boolean } };

const KIND_MARK: Record<string, string> = { claude: "✳", "claude-api": "✳", codex: "◎", deepseek: "◆" };

/** Seletor de modelo em painel, como no OpenBot: provedores à esquerda, busca e modelos à direita. */
export function ModelPicker({
  models,
  providers,
  model,
  provider,
  disabled,
  autoNote,
  onModel,
  onProvider
}: {
  models: ModelOpt[];
  providers: ProviderOpt[];
  model: string;
  provider: string;
  disabled?: boolean;
  autoNote?: string;
  onModel: (id: string) => void;
  onProvider: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(provider);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab(provider);
    setQ("");
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, provider]);

  const cur = providers.find((p) => p.id === provider);
  const tabP = providers.find((p) => p.id === tab);
  const ownModel = tabP && (tabP.kind === "codex" || tabP.kind === "deepseek");
  const label = cur && (cur.kind === "codex" || cur.kind === "deepseek") ? cur.name : models.find((m) => m.id === model)?.label ?? model;
  const list = models.filter((m) => !q.trim() || `${m.label} ${m.note}`.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = (id: string) => {
    if (tab !== provider) onProvider(tab);
    if (id) onModel(id);
    setOpen(false);
  };

  return (
    <div className="mpick" ref={ref}>
      <button type="button" className="mpick__btn" aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)} title="Modelo e provedor">
        <span className="mpick__mark" aria-hidden="true">
          {cur ? KIND_MARK[cur.kind] ?? "●" : "✳"}
        </span>
        <strong>{label}</strong>
        <span className="muted">· {cur ? cur.name : "Automático"}</span>
        <span className="mpick__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="mpick__pop" role="dialog" aria-label="Escolher modelo">
          <div className="mpick__side" role="tablist" aria-label="Provedores">
            <button type="button" role="tab" aria-selected={tab === ""} className="mpick__tab" title="Automático (contas Claude na ordem)" onClick={() => setTab("")}>
              A
            </button>
            {providers.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={tab === p.id} className="mpick__tab" title={p.name} onClick={() => setTab(p.id)}>
                {KIND_MARK[p.kind] ?? p.name.slice(0, 1)}
                {p.info.loggedIn === false ? <i className="mpick__off" aria-label="não conectada" /> : null}
              </button>
            ))}
          </div>
          <div className="mpick__main">
            <div className="mpick__head">
              <strong>{tabP ? tabP.name : "Automático"}</strong>
              <span className="small muted">
                {tabP
                  ? `${tabP.kind === "codex" ? "ChatGPT · só leitura" : tabP.kind === "deepseek" ? "DeepSeek · chave de API" : "Claude"}${tabP.info.loggedIn === false ? " · não conectada" : ""}`
                  : "Contas Claude na ordem; troca sozinha no limite"}
              </span>
            </div>
            {ownModel ? (
              <div className="mpick__own">
                <p className="small muted">Esta provedora usa o modelo escolhido em Configurações → Provedores de IA.</p>
                <button type="button" className="btn btn--sm" onClick={() => pick("")}>
                  Usar {tabP!.name}
                </button>
              </div>
            ) : (
              <>
                <input className="mpick__search" placeholder="Buscar modelo" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar modelo" />
                <ul className="mpick__list" role="listbox" aria-label="Modelos">
                  {list.map((m) => {
                    const on = m.id === model && tab === provider;
                    return (
                      <li key={m.id}>
                        <button type="button" role="option" aria-selected={on} className="mpick__opt" onClick={() => pick(m.id)}>
                          <span className={`mpick__radio${on ? " mpick__radio--on" : ""}`} aria-hidden="true" />
                          <span>Claude {m.label}</span>
                          <span className="mpick__note">{m.note}</span>
                        </button>
                      </li>
                    );
                  })}
                  {!list.length ? <li className="small muted mpick__none">Nenhum modelo com esse nome.</li> : null}
                </ul>
              </>
            )}
            {autoNote ? <p className="mpick__foot small muted">{autoNote}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
