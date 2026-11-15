"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, Message, ToolUse } from "@/lib/chat";
import { api } from "./api";
import { Markdown } from "./Markdown";

type ModelOpt = { id: string; label: string; note: string };
type Approval = { id: string; tool: string; summary: string; agent: string; status: "pending" | "approved" | "denied" };
type Pending = { id: string; name: string; size: number };

type Props = {
  initial: { conversation: Conversation; messages: Message[]; active: { id: string; status: string } | null };
  models: ModelOpt[];
  agentLabel: string;
  backHref: string;
};

const fmtCost = (v?: number) => (typeof v === "number" ? `US$ ${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}` : "");
const fmtSecs = (ms?: number) => (typeof ms === "number" ? `${Math.max(1, Math.round(ms / 1000))} s` : "");
const fmtTokens = (n?: number) => (typeof n === "number" && n > 0 ? `${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} tokens` : "");
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Steps({ tools, live = false }: { tools: ToolUse[]; live?: boolean }) {
  if (!tools.length) return null;
  const list = (
    <ul className="steps">
      {(live ? tools.slice(-4) : tools).map((t) => (
        <li key={t.id}>
          <b>{t.agent ? `${t.agent} › ${t.name}` : t.name}</b> {t.summary}
        </li>
      ))}
    </ul>
  );
  if (live) return list;
  return (
    <details className="fold">
      <summary>
        {tools.length} {tools.length === 1 ? "ação" : "ações"}
      </summary>
      {list}
    </details>
  );
}

export function ChatView({ initial, models, agentLabel, backHref }: Props) {
  const id = initial.conversation.id;
  const isContext = initial.conversation.mode === "contexto";
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [model, setModel] = useState(initial.conversation.model);
  const [title, setTitle] = useState(initial.conversation.title);
  const [running, setRunning] = useState(initial.active?.status === "running");
  const [liveText, setLiveText] = useState("");
  const [liveTools, setLiveTools] = useState<ToolUse[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const [redoOpen, setRedoOpen] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const modelLabel = models.find((m) => m.id === model)?.label ?? model;
  const topIndex = models.findIndex((m) => m.id === model);
  const upper = topIndex >= 0 && topIndex < models.length - 1 ? models[topIndex + 1] : null;
  const hasAnswer = messages.some((m) => m.role === "assistant");

  const connect = useCallback(() => {
    esRef.current?.close();
    setLiveText("");
    setLiveTools([]);
    setApprovals([]);
    const es = new EventSource(`/api/chat/${id}/stream?after=0`);
    esRef.current = es;
    const on = (type: string, fn: (data: Record<string, unknown>) => void) =>
      es.addEventListener(type, (e) => {
        try {
          fn(JSON.parse((e as MessageEvent).data));
        } catch {
          /* evento malformado: ignora */
        }
      });
    on("delta", (d) => setLiveText((t) => t + String(d.text ?? "")));
    on("tool", (d) => setLiveTools((t) => (t.some((x) => x.id === d.id) ? t : [...t, d as unknown as ToolUse])));
    on("approval", (d) => setApprovals((a) => (a.some((x) => x.id === d.id) ? a : [...a, { ...(d as unknown as Approval), status: "pending" }])));
    on("approval_done", (d) => setApprovals((a) => a.map((x) => (x.id === d.id ? { ...x, status: d.status as Approval["status"] } : x))));
    on("final", (d) => {
      const msg = d.message as Message;
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      setLiveText("");
      setLiveTools([]);
    });
    on("error", (d) => setError(String(d.message ?? "Erro na execução.")));
    const finish = () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
      setRunning(false);
      setApprovals([]);
    };
    on("end", finish);
    on("idle", () => {
      finish();
      // A execução terminou enquanto a aba estava fora: busca o que foi gravado.
      api<{ messages: Message[] }>(`/api/chat/${id}`)
        .then((r) => setMessages(r.messages))
        .catch(() => undefined);
    });
  }, [id]);

  useEffect(() => {
    if (initial.active?.status === "running") connect();
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Acompanha o fim da conversa, a menos que o Felipe tenha rolado para cima.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, liveText, liveTools, approvals]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [text]);

  async function send() {
    const body = text.trim();
    if ((!body && !files.length) || running || uploading) return;
    setError("");
    setRunning(true);
    stickRef.current = true;
    try {
      const r = await api<{ userMessage: Message }>(`/api/chat/${id}/messages`, { body: { text: body, attachmentIds: files.map((f) => f.id) } });
      if (!messages.length) setTitle(body.slice(0, 70) || title);
      setMessages((m) => [...m, r.userMessage]);
      setText("");
      setFiles([]);
      connect();
    } catch (e) {
      setRunning(false);
      setError(e instanceof Error ? e.message : "Não foi possível enviar.");
    }
  }

  async function redo(note: string) {
    setError("");
    setRedoOpen(false);
    setRunning(true);
    stickRef.current = true;
    try {
      const r = await api<{ userMessage: Message; model: string }>(`/api/chat/${id}/redo`, { body: { note } });
      setModel(r.model);
      setMessages((m) => [...m, r.userMessage]);
      connect();
    } catch (e) {
      setRunning(false);
      setError(e instanceof Error ? e.message : "Não foi possível refazer.");
    }
  }

  async function changeModel(next: string) {
    const before = model;
    setModel(next);
    try {
      await api(`/api/chat/${id}`, { method: "PATCH", body: { model: next } });
    } catch (e) {
      setModel(before);
      setError(e instanceof Error ? e.message : "Não foi possível trocar o modelo.");
    }
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(list).slice(0, 10)) {
        const form = new FormData();
        form.set("file", file);
        const r = await api<{ attachment: Pending }>(`/api/chat/${id}/attachments`, { form });
        setFiles((f) => [...f, r.attachment]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível anexar.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function decide(approvalId: string, decision: "allow" | "allow_always" | "deny") {
    try {
      await api(`/api/approvals/${approvalId}`, { body: { decision } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível responder.");
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  return (
    <div className="chat">
      <header className="chat__head">
        <a className="icon-btn" href={backHref} aria-label="Voltar para a lista">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </a>
        <div className="chat__title">
          <span className="kicker">{agentLabel}</span>
          <strong>{title}</strong>
        </div>
        <label className="sr-only" htmlFor="model">
          Modelo
        </label>
        <select id="model" className="field field--sm" style={{ width: "auto" }} value={model} disabled={running} onChange={(e) => void changeModel(e.target.value)}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {running ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void api(`/api/chat/${id}/stop`, { method: "POST" }).catch(() => undefined)}>
            Parar
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!upper || !hasAnswer}
            title={upper ? `Refaz a última resposta com ${upper.label}` : "Já está no modelo mais forte"}
            onClick={() => setRedoOpen((o) => !o)}
          >
            Subir de modelo
          </button>
        )}
      </header>

      <div
        className="chat__scroll"
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="chat__inner" aria-live="polite">
          {!messages.length && !running ? (
            <div className="stack">
              <p className="h2">{isContext ? "Pergunte sobre o negócio." : `Fale com ${agentLabel.toLowerCase()}.`}</p>
              <p className="muted">
                {isContext
                  ? "A resposta vem só dos arquivos .md do repositório, com o arquivo citado. Se não estiver lá, ele diz que não está no contexto."
                  : "Leitura e pesquisa rodam direto. Para terminal, escrita de arquivo ou ação em sistema externo, a Central pede a sua aprovação aqui."}
              </p>
            </div>
          ) : null}

          {messages.map((m) =>
            m.role === "user" ? (
              <article key={m.id} className="msg msg--user">
                <span className="kicker kicker--plain">{m.meta.redo ? "Felipe · subir de modelo" : "Felipe"}</span>
                <div className="msg__body">{m.content}</div>
                {m.meta.attachments?.length ? (
                  <div className="tags">
                    {m.meta.attachments.map((a) => (
                      <span className="tag" key={a.id}>
                        {a.name} · {fmtSize(a.size)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : (
              <article key={m.id} className="msg">
                <span className="kicker">
                  {m.meta.agent ?? agentLabel} · {models.find((x) => x.id === m.meta.model)?.label ?? m.meta.model ?? ""}
                </span>
                {m.content ? <Markdown text={m.content} /> : null}
                {m.meta.error ? (
                  <p className="notice" role="alert">
                    {m.meta.error}
                  </p>
                ) : null}
                {m.meta.stopped ? <p className="notice notice--plain">Execução parada por você.</p> : null}
                <Steps tools={m.meta.tools ?? []} />
                <p className="msg__meta">{[fmtSecs(m.meta.durationMs), fmtCost(m.meta.costUsd), fmtTokens((m.meta.inputTokens ?? 0) + (m.meta.outputTokens ?? 0)), m.meta.auth].filter(Boolean).join(" · ")}</p>
              </article>
            )
          )}

          {running ? (
            <article className="msg" data-testid="live">
              <span className="kicker">
                {agentLabel} · {modelLabel}
              </span>
              {liveText ? <Markdown text={liveText} /> : null}
              <Steps tools={liveTools} live />
              {pendingApprovals.map((a) => (
                <div className="approval" key={a.id} role="group" aria-label="Pedido de aprovação">
                  <span className="kicker">Precisa de você · {a.agent}</span>
                  <p>
                    <strong>{a.tool}</strong>
                  </p>
                  {a.summary ? <pre className="pre">{a.summary}</pre> : null}
                  <div className="row">
                    <button type="button" className="btn btn--sm" onClick={() => void decide(a.id, "allow")}>
                      Permitir
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void decide(a.id, "allow_always")}>
                      Sempre nesta conversa
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void decide(a.id, "deny")}>
                      Negar
                    </button>
                  </div>
                </div>
              ))}
              {!pendingApprovals.length ? (
                <p className="msg__meta">
                  trabalhando
                  <span className="cursor" aria-hidden="true" />
                </p>
              ) : null}
            </article>
          ) : null}

          {error ? (
            <p className="notice" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="composer">
        <div className="composer__inner">
          {redoOpen && upper ? (
            <form
              className="approval"
              onSubmit={(e) => {
                e.preventDefault();
                void redo(String(new FormData(e.currentTarget).get("note") ?? ""));
              }}
            >
              <label className="label" htmlFor="note">
                Refazer com {upper.label} · o que não ficou bom? (opcional)
              </label>
              <input className="field field--sm" id="note" name="note" autoFocus placeholder="ex.: ficou longo, faltou o preço atual" />
              <div className="row">
                <button className="btn btn--sm">Refazer</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRedoOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}
          {files.length ? (
            <div className="tags">
              {files.map((f) => (
                <button type="button" className="tag" key={f.id} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))} aria-label={`Remover anexo ${f.name}`}>
                  {f.name} · {fmtSize(f.size)} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="composer__row">
            {isContext ? (
              <span />
            ) : (
              <>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => void upload(e.target.files)} data-testid="file-input" />
                <button type="button" className="icon-btn" style={{ width: 48, height: 48 }} aria-label="Anexar arquivo" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M9 3v12M3 9h12" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </>
            )}
            <label className="sr-only" htmlFor="composer">
              Mensagem
            </label>
            <textarea
              id="composer"
              ref={taRef}
              className="field"
              rows={1}
              value={text}
              placeholder={isContext ? "Qual é a oferta atual do site?" : "Escreva para o agente…"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // No computador, Enter envia; no celular, Enter quebra linha e o botão envia.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button type="button" className="btn" onClick={() => void send()} disabled={running || uploading || (!text.trim() && !files.length)}>
              {uploading ? "Anexando…" : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
