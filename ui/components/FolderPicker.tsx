"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { IconFolder, IconPlus } from "./Icons";

type Lista = {
  caminho: string;
  pai: string | null;
  raiz: string;
  casa: string;
  subpastas: { nome: string; caminho: string }[];
  erro?: string;
};

/**
 * Seletor de pastas do computador, no estilo do Claude.
 * No app desktop, o botão "Escolher no computador" abre o diálogo nativo;
 * no navegador (VPS), navega pelas pastas do próprio servidor.
 */
export function FolderPicker({ inicial, titulo, onPick, onClose }: { inicial?: string | null; titulo?: string; onPick: (caminho: string) => void; onClose: () => void }) {
  const [caminho, setCaminho] = useState(inicial ?? "");
  const [dados, setDados] = useState<Lista | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState("");
  const [criando, setCriando] = useState(false);
  const desktop = typeof window !== "undefined" ? window.centralDesktop : undefined;

  const abrir = useCallback(async (alvo: string) => {
    setCarregando(true);
    setErro("");
    try {
      const r = await api<Lista>(`/api/pastas${alvo ? `?caminho=${encodeURIComponent(alvo)}` : ""}`);
      setDados(r);
      setCaminho(r.caminho);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não abriu a pasta.");
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void abrir(inicial ?? "");
  }, [abrir, inicial]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const deskCriar = async (pai: string, nome: string): Promise<string> => {
    if (desktop) return desktop.criarPasta(pai, nome);
    const r = await api<{ caminho: string }>("/api/pastas", { body: { caminho: pai, nome } });
    return r.caminho;
  };

  const criar = async () => {
    if (!dados || !nova.trim()) return;
    setCriando(true);
    setErro("");
    try {
      const alvo = await deskCriar(dados.caminho, nova.trim());
      setNova("");
      await abrir(alvo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não criei a pasta.");
    }
    setCriando(false);
  };

  return (
    <div className="fpick" role="dialog" aria-modal="true" aria-label={titulo ?? "Escolher pasta"} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fpick__box">
        <header className="fpick__head">
          <span className="proj__icon" aria-hidden="true">
            <IconFolder size={18} />
          </span>
          <div>
            <h2 className="fpick__title">{titulo ?? "Escolher pasta do projeto"}</h2>
            <p className="small muted">O agente trabalha nesta pasta: lê, escreve e roda comandos nela.</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        </header>

        <div className="fpick__bar">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => dados?.pai && void abrir(dados.pai)} disabled={!dados?.pai || carregando} title="Pasta acima">
            ↑
          </button>
          <code className="fpick__path" title={caminho}>
            {caminho || "…"}
          </code>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void abrir(dados?.raiz ?? "")} disabled={!dados || carregando}>
            Projetos
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void abrir(dados?.casa ?? "~")} disabled={!dados || carregando}>
            Minha pasta
          </button>
        </div>

        {desktop ? (
          <button
            type="button"
            className="btn btn--sm fpick__nativo"
            onClick={async () => {
              const p = await desktop.escolherPasta({ titulo: titulo ?? "Escolher pasta do projeto", inicial: caminho });
              if (p) await abrir(p);
            }}
          >
            Escolher no computador…
          </button>
        ) : null}

        <div className="fpick__list" role="list">
          {carregando ? <p className="small muted fpick__empty">Abrindo…</p> : null}
          {!carregando && dados?.erro ? <p className="notice small">{dados.erro}</p> : null}
          {!carregando && dados && !dados.subpastas.length ? <p className="small muted fpick__empty">Nenhuma subpasta aqui.</p> : null}
          {dados?.subpastas.map((s) => (
            <button key={s.caminho} type="button" role="listitem" className="fpick__item" onClick={() => void abrir(s.caminho)}>
              <IconFolder size={15} />
              <span>{s.nome}</span>
              <small className="muted">abrir</small>
            </button>
          ))}
        </div>

        <form
          className="fpick__novo"
          onSubmit={(e) => {
            e.preventDefault();
            void criar();
          }}
        >
          <input className="field" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da pasta nova (criada aqui dentro)" maxLength={80} disabled={!dados || criando} />
          <button className="btn btn--sm" disabled={!dados || criando || !nova.trim()}>
            <IconPlus size={14} /> {criando ? "Criando…" : "Criar pasta"}
          </button>
        </form>

        {erro ? (
          <p className="notice small" role="alert">
            {erro}
          </p>
        ) : null}

        <footer className="fpick__foot">
          <span className="small muted">Usar: {caminho || "—"}</span>
          <button type="button" className="btn btn--sm btn--on" disabled={!caminho} onClick={() => caminho && onPick(caminho)}>
            Usar esta pasta
          </button>
        </footer>
      </div>
    </div>
  );
}
