"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { agentName } from "./ConversationList";
import { FolderPicker } from "./FolderPicker";
import { IconFolder, IconPlus } from "./Icons";

type Project = { id: string; slug: string; name: string; description: string; instructions: string; folder: string | null; conversations?: number; last_at?: string | null; updated_at: string };
type Conv = { id: string; title: string; mode: string; agent: string; updated_at: string; preview: string; route: { agent?: string } | null };

function quando(iso?: string | null): string {
  if (!iso) return "sem conversas";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Lista de projetos com criação em um passo, como no Claude. */
export function ProjectsView() {
  const router = useRouter();
  const [list, setList] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ projects: Project[] }>("/api/projetos")
      .then((r) => setList(r.projects))
      .catch((e) => setError(e instanceof Error ? e.message : "Não carregou."));
  }, []);

  return (
    <div className="stack stack--lg">
      <header className="proj__head">
        <div>
          <h1 className="title">Projetos</h1>
          <p className="lead">Agrupe conversas e dê instruções que valem para todas elas. No chat, chame um projeto com @.</p>
        </div>
        <button type="button" className="btn btn--sm btn--on" onClick={() => setCreating(true)}>
          <IconPlus size={16} /> Novo projeto
        </button>
      </header>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {creating ? (
        <ProjectForm
          onCancel={() => setCreating(false)}
          onSave={async (v) => {
            const r = await api<{ project: Project }>("/api/projetos", { body: v });
            router.push(`/projetos/${r.project.slug}`);
          }}
        />
      ) : null}
      {list === null ? (
        <p className="muted">Carregando…</p>
      ) : list.length ? (
        <ul className="proj__grid">
          {list.map((p) => (
            <li key={p.id}>
              <Link className="proj__card" href={`/projetos/${p.slug}`}>
                <span className="proj__icon" aria-hidden="true">
                  <IconFolder size={18} />
                </span>
                <strong>{p.name}</strong>
                <span className="small muted proj__desc">{p.description || "Sem descrição."}</span>
                <span className="small muted">
                  @{p.slug} · {p.conversations ?? 0} conversas · {quando(p.last_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : !creating ? (
        <div className="proj__empty">
          <IconFolder size={28} />
          <p>Nenhum projeto ainda.</p>
          <button type="button" className="btn btn--sm" onClick={() => setCreating(true)}>
            Criar o primeiro
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProjectForm({
  initial,
  onSave,
  onCancel
}: {
  initial?: Partial<Project>;
  onSave: (v: { name: string; description: string; instructions: string; folder: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [folder, setFolder] = useState(initial?.folder ?? "");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="proj__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave({ name, description, instructions, folder });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não salvou.");
        }
        setBusy(false);
      }}
    >
      <label className="label" htmlFor="pj-name">
        Nome
      </label>
      <input id="pj-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Site LPFDS" autoFocus required maxLength={80} />
      <label className="label" htmlFor="pj-desc">
        Descrição <span className="muted">(opcional)</span>
      </label>
      <input id="pj-desc" className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Do que se trata, em uma linha" maxLength={500} />
      <label className="label" htmlFor="pj-ins">
        Instruções <span className="muted">(entram em toda conversa do projeto)</span>
      </label>
      <textarea
        id="pj-ins"
        className="field"
        rows={6}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={"Ex.: Repositório madebyfelipe/lpfds, deploy na Vercel (branch beta).\nTom: direto, sem jargão. Sempre testar no celular."}
        maxLength={8000}
      />
      <label className="label" htmlFor="pj-folder">
        Pasta do projeto <span className="muted">(onde o agente trabalha)</span>
      </label>
      <div className="proj__folder">
        <input id="pj-folder" className="field" value={folder} readOnly placeholder="Criada automaticamente em ~/Central/Projetos" title={folder} />
        <button type="button" className="btn btn--sm" onClick={() => setPicker(true)}>
          Escolher…
        </button>
      </div>
      <p className="small muted">Vazio = a Central cria uma pasta com o nome do projeto. A pasta pode ficar em qualquer lugar do computador, fora do repositório.</p>
      {error ? <p className="notice small">{error}</p> : null}
      <div className="row">
        <button className="btn btn--sm btn--on" disabled={busy || !name.trim()}>
          {busy ? "Salvando…" : initial ? "Salvar" : "Criar projeto"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      {picker ? <FolderPicker inicial={folder || null} onPick={(p) => (setFolder(p), setPicker(false))} onClose={() => setPicker(false)} /> : null}
    </form>
  );
}

/** Um projeto: conversas dele, nova conversa já no projeto e as instruções editáveis. */
export function ProjectView({ id }: { id: string }) {
  const router = useRouter();
  const [p, setP] = useState<Project | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ project: Project; conversations: Conv[] }>(`/api/projetos/${encodeURIComponent(id)}`);
      setP(r.project);
      setConvs(r.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não carregou.");
    }
  }, [id]);
  useEffect(() => void load(), [load]);

  if (error) return <p className="notice">{error}</p>;
  if (!p) return <p className="muted">Carregando…</p>;

  return (
    <div className="stack stack--lg">
      <Link href="/projetos" className="small muted proj__back">
        ← Todos os projetos
      </Link>
      <header className="proj__head">
        <div>
          <h1 className="title">{p.name}</h1>
          <p className="lead">
            {p.description || "Sem descrição."} <span className="muted">· chame com @{p.slug}</span>
          </p>
        </div>
        <Link className="btn btn--sm btn--on" href={`/?projeto=${p.slug}`}>
          <IconPlus size={16} /> Nova conversa
        </Link>
      </header>

      <div className="proj__pasta">
        <IconFolder size={15} />
        <code className="small" title={p.folder ?? ""}>
          {p.folder || "pasta automática em ~/Central/Projetos"}
        </code>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicker(true)}>
          Trocar pasta
        </button>
        {p.folder && typeof window !== "undefined" && window.centralDesktop ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void window.centralDesktop!.abrirPasta(p.folder!)}>
            Abrir no sistema
          </button>
        ) : p.folder ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              await navigator.clipboard.writeText(p.folder!).catch(() => undefined);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1600);
            }}
          >
            {copiado ? "Copiado" : "Copiar caminho"}
          </button>
        ) : null}
      </div>
      {picker ? (
        <FolderPicker
          inicial={p.folder}
          onClose={() => setPicker(false)}
          onPick={async (caminho) => {
            setPicker(false);
            try {
              const r = await api<{ project: Project }>(`/api/projetos/${p.id}`, { method: "PATCH", body: { folder: caminho } });
              setP(r.project);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Não troquei a pasta.");
            }
          }}
        />
      ) : null}

      <div className="proj__cols">
        <section className="stack">
          <h2 className="proj__h2">Conversas</h2>
          {convs.length ? (
            <ul className="proj__convs">
              {convs.map((c) => (
                <li key={c.id}>
                  <Link href={`/${c.mode === "contexto" ? "contexto" : "chat"}/${c.id}`} className="proj__conv">
                    <strong>{c.title}</strong>
                    <span className="small muted">
                      {agentName(c.agent === "auto" ? c.route?.agent ?? "auto" : c.agent)} · {quando(c.updated_at)}
                    </span>
                    {c.preview ? <span className="small muted proj__desc">{c.preview}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Nenhuma conversa ainda. Comece uma em “Nova conversa”, ou mova uma conversa para cá pelo menu ⋯ do chat.</p>
          )}
        </section>

        <aside className="proj__side">
          <div className="row row--between">
            <h2 className="proj__h2">Instruções</h2>
            {!editing ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                Editar
              </button>
            ) : null}
          </div>
          {editing ? (
            <ProjectForm
              initial={p}
              onCancel={() => setEditing(false)}
              onSave={async (v) => {
                const r = await api<{ project: Project }>(`/api/projetos/${p.id}`, { method: "PATCH", body: v });
                setEditing(false);
                if (r.project.slug !== id) router.replace(`/projetos/${r.project.slug}`);
                else setP(r.project);
              }}
            />
          ) : (
            <p className="proj__ins small">{p.instructions || <span className="muted">Sem instruções. Elas entram em toda conversa deste projeto.</span>}</p>
          )}
          {!editing ? (
            <button
              type="button"
              className="link small proj__del"
              onClick={async () => {
                if (!confirm(`Apagar o projeto "${p.name}"? As conversas continuam, só saem do projeto.`)) return;
                await api(`/api/projetos/${p.id}`, { method: "DELETE" });
                router.push("/projetos");
              }}
            >
              Apagar projeto
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
