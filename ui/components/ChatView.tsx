"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, Message, ToolUse, TriageView } from "@/lib/chat";
import { api } from "./api";
import { agentName, REFRESH_EVENT } from "./ConversationList";
import { sendFeedback } from "./FeedbackButton";
import { IconBack, IconMic, IconMore, IconPlus, IconSend, IconStop, IconTool } from "./Icons";
import { Markdown } from "./Markdown";

type ModelOpt = { id: string; label: string; note: string };
type Approval = { id: string; tool: string; summary: string; agent: string; status: "pending" | "approved" | "denied" };
type Pending = { id: string; name: string; size: number };

type Props = {
  initial: { conversation: Conversation | null; messages: Message[]; active: { id: string; status: string } | null };
  models: ModelOpt[];
  backHref: string;
  /** Conversa nova: "chat" (triagem) ou "contexto". */
  draftMode?: "chat" | "contexto";
};

const fmtCost = (v?: number) => (typeof v === "number" ? `US$ ${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}` : "");
const fmtSecs = (ms?: number) => (typeof ms === "number" ? `${Math.max(1, Math.round(ms / 1000))} s` : "");
const fmtTokens = (n?: number) => (typeof n === "number" && n > 0 ? `${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} tokens` : "");
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Steps({ tools, live = false }: { tools: ToolUse[]; live?: boolean }) {
  if (!tools.length) return null;
  const list = (
    <ul className="steps">
      {(live ? tools.slice(-4) : tools).map((t) => (
        <li key={t.id}>
          <IconTool size={14} />
          <span>
            <b>{t.agent ? `${t.agent} › ${t.name}` : t.name}</b> {t.summary}
          </span>
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

const ANOTADO: Record<string, string> = { feedback: "feedback", decisao: "decisão", ideia: "ideia" };

function TriageCard({ t, modelLabel }: { t: TriageView; modelLabel: (id: string) => string }) {
  const passos = t.passos ?? [];
  return (
    <div className="triage" data-testid="triage">
      <div className="triage__head">
        <span className="kicker">Triagem{t.nivel ? ` · ${t.nivel}` : ""}</span>
        {passos.length ? (
          <span className="small muted">
            {passos.map((p) => `${agentName(p.agente)} (${modelLabel(p.modelo)})`).join(" → ")}
            {t.planejar ? " · esperando o seu vai" : ""}
          </span>
        ) : null}
      </div>
      {t.falhou ? <p className="small">{t.falhou}</p> : null}
      {passos.length > 1 ? (
        <details className="fold">
          <summary>{passos.length} passos</summary>
          <ol className="triage__steps">
            {passos.map((p) => (
              <li key={p.n}>
                {p.o_que} <span className="muted">· {agentName(p.agente)}, {modelLabel(p.modelo)}{p.checagem ? ` · checagem: ${p.checagem}` : ""}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {t.anotados?.length ? (
        <ul className="triage__notes">
          {t.anotados.map((a, i) => (
            <li key={i}>
              <span className="tag">{ANOTADO[a.tipo] ?? a.tipo}</span> {a.texto} <span className="muted">→ {a.onde}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {t.suposicoes?.length ? <p className="small muted">Assumi: {t.suposicoes.join("; ")}</p> : null}
    </div>
  );
}

function FeedbackRow({ onde }: { onde: string }) {
  const [state, setState] = useState<"" | "bom" | "ruim" | "comentar" | "ok" | "erro">("");
  const [text, setText] = useState("");
  const send = async (s: "bom" | "ruim" | "ideia", texto = "") => {
    try {
      await sendFeedback(s, onde, texto);
      setState("ok");
    } catch {
      setState("erro");
    }
  };
  if (state === "ok") return <span className="small muted">feedback anotado</span>;
  return (
    <span className="fbrow">
      <button type="button" className="fbrow__btn" aria-label="Resposta boa" title="Bom" onClick={() => void send("bom")}>
        bom
      </button>
      <button type="button" className="fbrow__btn" aria-label="Resposta ruim" title="Ruim" onClick={() => void send("ruim")}>
        ruim
      </button>
      {state === "comentar" ? (
        <form
          className="fbrow__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void send("ideia", text);
          }}
        >
          <input className="field field--sm" aria-label="Comentário sobre a resposta" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="o que achou?" />
          <button className="fbrow__btn">anotar</button>
        </form>
      ) : (
        <button type="button" className="fbrow__btn" onClick={() => setState("comentar")}>
          comentar
        </button>
      )}
      {state === "erro" ? <span className="small">não gravou</span> : null}
    </span>
  );
}

/** Grava pelo microfone e devolve PCM mono 16 kHz (o formato que o servidor transcreve). */
async function toPcm16k(blob: Blob): Promise<Float32Array> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * 16000));
    const off = new OfflineAudioContext(1, length, 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void ctx.close();
  }
}

export function ChatView({ initial, models, backHref, draftMode = "chat" }: Props) {
  const [conv, setConv] = useState<Conversation | null>(initial.conversation);
  const isContext = (conv?.mode ?? draftMode) === "contexto";
  const isAuto = !conv || conv.agent === "auto";
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [model, setModel] = useState(initial.conversation?.model ?? (isContext ? "claude-sonnet-5-5" : "claude-sonnet-5-5"));
  const [title, setTitle] = useState(initial.conversation?.title ?? "Nova conversa");
  const [running, setRunning] = useState(initial.active?.status === "running");
  const [liveText, setLiveText] = useState("");
  const [liveTools, setLiveTools] = useState<ToolUse[]>([]);
  const [liveTriage, setLiveTriage] = useState<TriageView | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [liveAgent, setLiveAgent] = useState<{ agent: string; model: string } | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const [redoOpen, setRedoOpen] = useState(false);
  const [rec, setRec] = useState<{ state: "idle" | "rec" | "trans"; secs: number }>({ state: "idle", secs: 0 });

  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ mr: MediaRecorder; chunks: Blob[]; stream: MediaStream; timer: ReturnType<typeof setInterval>; cancel: boolean } | null>(null);

  const label = (id?: string) => models.find((m) => m.id === id)?.label ?? id ?? "";
  const topIndex = models.findIndex((m) => m.id === model);
  const upper = topIndex >= 0 && topIndex < models.length - 1 ? models[topIndex + 1] : null;
  const hasAnswer = messages.some((m) => m.role === "assistant" && !m.meta.feedback);
  const headAgent = isContext ? "Modo Contexto" : isAuto ? (conv?.route?.agent ? `Central · ${agentName(conv.route.agent)}` : "Central") : agentName(conv!.agent);
  const refreshList = () => window.dispatchEvent(new Event(REFRESH_EVENT));

  const connect = useCallback((cid: string) => {
    esRef.current?.close();
    setLiveText("");
    setLiveTools([]);
    setApprovals([]);
    setLiveTriage(null);
    setTriaging(false);
    setLiveAgent(null);
    const es = new EventSource(`/api/chat/${cid}/stream?after=0`);
    esRef.current = es;
    const on = (type: string, fn: (data: Record<string, unknown>) => void) =>
      es.addEventListener(type, (e) => {
        try {
          fn(JSON.parse((e as MessageEvent).data));
        } catch {
          /* evento malformado: ignora */
        }
      });
    on("start", (d) => setLiveAgent({ agent: String(d.agent ?? ""), model: String(d.model ?? "") }));
    on("triage_start", () => setTriaging(true));
    on("triage", (d) => {
      setTriaging(false);
      setLiveTriage(d as unknown as TriageView);
    });
    on("route", (d) => {
      setLiveAgent({ agent: String(d.agent ?? ""), model: String(d.model ?? "") });
      setModel(String(d.model ?? ""));
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
      setLiveTriage(null);
    });
    on("error", (d) => setError(String(d.message ?? "Erro na execução.")));
    const finish = () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
      setRunning(false);
      setApprovals([]);
      setTriaging(false);
      refreshList();
    };
    on("end", finish);
    on("idle", () => {
      finish();
      // A execução terminou enquanto a aba estava fora: busca o que foi gravado.
      api<{ messages: Message[] }>(`/api/chat/${cid}`)
        .then((r) => setMessages(r.messages))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (initial.conversation && initial.active?.status === "running") connect(initial.conversation.id);
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Acompanha o fim da conversa, a menos que o Felipe tenha rolado para cima.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, liveText, liveTools, approvals, liveTriage, triaging]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [text]);

  /** Conversa nova: cria no primeiro envio e troca a URL sem recarregar. */
  async function ensureConversation(): Promise<Conversation> {
    if (conv) return conv;
    const r = await api<{ conversation: Conversation }>("/api/chat", { body: { mode: draftMode } });
    setConv(r.conversation);
    setModel(r.conversation.model);
    window.history.replaceState(null, "", `/${draftMode === "contexto" ? "contexto" : "chat"}/${r.conversation.id}`);
    return r.conversation;
  }

  async function send(override?: string, audio = false) {
    const body = (override ?? text).trim();
    if ((!body && !files.length) || running || uploading) return;
    setError("");
    setRunning(true);
    stickRef.current = true;
    try {
      const c = await ensureConversation();
      const r = await api<{ userMessage: Message; reply?: Message }>(`/api/chat/${c.id}/messages`, { body: { text: body, attachmentIds: files.map((f) => f.id), audio } });
      if (!messages.length) setTitle(body.replace(/^\s*fb\s*:\s*/i, "").slice(0, 70) || title);
      setMessages((m) => [...m, r.userMessage, ...(r.reply ? [r.reply] : [])]);
      if (override === undefined) setText("");
      setFiles([]);
      if (r.reply) {
        setRunning(false);
        refreshList();
      } else connect(c.id);
    } catch (e) {
      setRunning(false);
      setError(e instanceof Error ? e.message : "Não foi possível enviar.");
    }
  }

  async function redo(note: string) {
    if (!conv) return;
    setError("");
    setRedoOpen(false);
    setRunning(true);
    stickRef.current = true;
    try {
      const r = await api<{ userMessage: Message; model: string }>(`/api/chat/${conv.id}/redo`, { body: { note } });
      setModel(r.model);
      setMessages((m) => [...m, r.userMessage]);
      connect(conv.id);
    } catch (e) {
      setRunning(false);
      setError(e instanceof Error ? e.message : "Não foi possível refazer.");
    }
  }

  async function changeModel(next: string) {
    const before = model;
    setModel(next);
    if (!conv) return;
    try {
      await api(`/api/chat/${conv.id}`, { method: "PATCH", body: { model: next } });
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
      const c = await ensureConversation();
      for (const file of Array.from(list).slice(0, 10)) {
        const form = new FormData();
        form.set("file", file);
        const r = await api<{ attachment: Pending }>(`/api/chat/${c.id}/attachments`, { form });
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

  /* ---------- voz: grava, transcreve na VPS, envia ---------- */
  async function startRec() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não grava áudio. Abra pelo endereço https da Central.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const started = Date.now();
      const timer = setInterval(() => setRec({ state: "rec", secs: Math.round((Date.now() - started) / 1000) }), 500);
      recRef.current = { mr, chunks, stream, timer, cancel: false };
      mr.onstop = () => void finishRec();
      mr.start(1000);
      setRec({ state: "rec", secs: 0 });
    } catch {
      setError("Sem acesso ao microfone. Libere a permissão do microfone para este site.");
    }
  }

  function stopRec(cancel = false) {
    const r = recRef.current;
    if (!r) return;
    r.cancel = cancel;
    clearInterval(r.timer);
    r.stream.getTracks().forEach((t) => t.stop());
    if (r.mr.state !== "inactive") r.mr.stop();
  }

  async function finishRec() {
    const r = recRef.current;
    recRef.current = null;
    if (!r || r.cancel) {
      setRec({ state: "idle", secs: 0 });
      return;
    }
    setRec((x) => ({ state: "trans", secs: x.secs }));
    try {
      const pcm = await toPcm16k(new Blob(r.chunks, { type: r.mr.mimeType || "audio/webm" }));
      const res = await fetch("/api/transcrever", { method: "POST", body: new Blob([pcm.buffer as ArrayBuffer]), headers: { "Content-Type": "application/octet-stream" }, credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setRec({ state: "idle", secs: 0 });
      if (!data.text?.trim()) {
        setError("Não entendi o áudio. Tente de novo, mais perto do microfone.");
        return;
      }
      await send(data.text, true);
    } catch (e) {
      setRec({ state: "idle", secs: 0 });
      setError(e instanceof Error ? e.message : "Não consegui transcrever.");
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const empty = !messages.length && !running;

  return (
    <div className="chat">
      <header className="chat__head">
        <a className="rail__btn chat__back" href={backHref} aria-label="Voltar para a lista">
          <IconBack />
        </a>
        <div className="chat__title">
          <span className="kicker">{headAgent}</span>
          <strong>{title}</strong>
        </div>
        {running ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => conv && void api(`/api/chat/${conv.id}/stop`, { method: "POST" }).catch(() => undefined)}>
            Parar
          </button>
        ) : hasAnswer && upper ? (
          <button type="button" className="btn btn--ghost btn--sm" title={`Refaz a última resposta com ${upper.label}`} onClick={() => setRedoOpen((o) => !o)}>
            Subir de modelo
          </button>
        ) : null}
        <details className="pop">
          <summary className="rail__btn" aria-label="Mais opções" title="Mais opções">
            <IconMore />
          </summary>
          <div className="pop__panel">
            <label className="label" htmlFor="model">
              Modelo {isAuto && !isContext ? "(a triagem escolhe; vale para subir de modelo)" : ""}
            </label>
            <select id="model" className="field field--sm" value={model} disabled={running} onChange={(e) => void changeModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <a className="link small" href="/agentes">
              Falar direto com um agente
            </a>
            {conv ? (
              <button
                type="button"
                className="link small"
                onClick={async () => {
                  if (!window.confirm("Arquivar esta conversa? Ela sai da lista.")) return;
                  await api(`/api/chat/${conv.id}`, { method: "DELETE" }).catch(() => undefined);
                  window.location.href = "/";
                }}
              >
                Arquivar conversa
              </button>
            ) : null}
          </div>
        </details>
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
          {empty ? (
            <div className="hello">
              {isContext ? (
                <>
                  <p className="h2">Pergunte sobre o negócio.</p>
                  <p className="muted">A resposta vem só dos arquivos .md do repositório, com o arquivo citado. Se não estiver lá, ele diz que não está no contexto.</p>
                </>
              ) : (
                <>
                  <button type="button" className="bigmic" onClick={() => (rec.state === "rec" ? stopRec() : void startRec())} disabled={rec.state === "trans"} aria-label={rec.state === "rec" ? "Parar e enviar o áudio" : "Falar"}>
                    {rec.state === "rec" ? <IconStop size={40} /> : <IconMic size={40} />}
                  </button>
                  <p className="h2">{rec.state === "rec" ? `Gravando ${fmtClock(rec.secs)} · toque para enviar` : rec.state === "trans" ? "Transcrevendo…" : "Fale ou escreva."}</p>
                  <p className="muted">Pode misturar assuntos. A triagem separa tarefa, ideia, feedback e decisão, escolhe agente e modelo e já executa.</p>
                  <p className="small muted">
                    <code>fb:</code> anota feedback · <code>planejar:</code> mostra o plano e espera o “vai”
                  </p>
                </>
              )}
            </div>
          ) : null}

          {messages.map((m) =>
            m.role === "user" ? (
              <article key={m.id} className="msg msg--user">
                <div className="msg__body">
                  {m.meta.audio ? <span className="kicker kicker--plain">áudio · </span> : null}
                  {m.meta.redo ? <span className="kicker kicker--plain">subir de modelo · </span> : null}
                  {m.content}
                </div>
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
                {m.meta.triage ? <TriageCard t={m.meta.triage} modelLabel={label} /> : null}
                <span className="kicker">
                  {agentName(m.meta.agent ?? (isContext ? "contexto" : conv?.agent ?? "auto"))}
                  {m.meta.model ? ` · ${label(m.meta.model)}` : ""}
                </span>
                {m.content ? (
                  <div className="msg__bubble">
                    <Markdown text={m.content} />
                  </div>
                ) : null}
                {m.meta.error ? (
                  <p className="notice" role="alert">
                    {m.meta.error}
                  </p>
                ) : null}
                {m.meta.stopped ? <p className="notice notice--plain">Execução parada por você.</p> : null}
                <Steps tools={m.meta.tools ?? []} />
                <p className="msg__meta">
                  <span>{[fmtSecs(m.meta.durationMs), fmtCost(m.meta.costUsd), fmtTokens((m.meta.inputTokens ?? 0) + (m.meta.outputTokens ?? 0)), m.meta.auth].filter(Boolean).join(" · ")}</span>
                  {!m.meta.feedback ? <FeedbackRow onde={`Central · chat · ${m.meta.agent ?? ""} ${label(m.meta.model)} · "${title.slice(0, 60)}"`} /> : null}
                </p>
              </article>
            )
          )}

          {running ? (
            <article className="msg" data-testid="live">
              {triaging ? <p className="msg__meta">Triagem · lendo o pedido e escolhendo agente e modelo…</p> : null}
              {liveTriage ? <TriageCard t={liveTriage} modelLabel={label} /> : null}
              {liveAgent && !triaging ? (
                <span className="kicker">
                  {agentName(liveAgent.agent)} · {label(liveAgent.model)}
                </span>
              ) : null}
              {liveText ? (
                <div className="msg__bubble">
                  <Markdown text={liveText} />
                </div>
              ) : null}
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
              {!pendingApprovals.length && !triaging ? (
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
          <div className={`composer__box${rec.state === "rec" ? " composer__box--rec" : ""}`}>
            {!isContext ? (
              <>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => void upload(e.target.files)} data-testid="file-input" />
                <button type="button" className="round" aria-label="Anexar arquivo" disabled={uploading || rec.state !== "idle"} onClick={() => fileRef.current?.click()}>
                  <IconPlus />
                </button>
              </>
            ) : null}
            {rec.state === "idle" ? (
              <>
                <label className="sr-only" htmlFor="composer">
                  Mensagem
                </label>
                <textarea
                  id="composer"
                  ref={taRef}
                  rows={1}
                  value={text}
                  placeholder={isContext ? "Qual é a oferta atual do site?" : "Fale ou escreva…"}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    // No computador, Enter envia; no celular, Enter quebra linha e o botão envia.
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
              </>
            ) : (
              <p className="composer__rec" role="status">
                {rec.state === "rec" ? (
                  <>
                    <i className="recdot" aria-hidden="true" /> Gravando {fmtClock(rec.secs)}
                    <button type="button" className="link small" onClick={() => stopRec(true)}>
                      descartar
                    </button>
                  </>
                ) : (
                  "Transcrevendo na VPS…"
                )}
              </p>
            )}
            {!isContext ? (
              <button
                type="button"
                className={`round${rec.state === "rec" ? " round--rec" : ""}`}
                aria-label={rec.state === "rec" ? "Parar e enviar o áudio" : "Gravar áudio"}
                disabled={running || rec.state === "trans"}
                onClick={() => (rec.state === "rec" ? stopRec() : void startRec())}
              >
                {rec.state === "rec" ? <IconStop /> : <IconMic />}
              </button>
            ) : null}
            {rec.state === "idle" ? (
              <button type="button" className="round round--send" onClick={() => void send()} disabled={running || uploading || (!text.trim() && !files.length)} aria-label="Enviar">
                <IconSend />
                <span className="sr-only">{uploading ? "Anexando…" : "Enviar"}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
