"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

type Info = { loggedIn?: boolean; email?: string; plan?: string; detail?: string; checkedAt?: string; limitedUntil?: string };
type Provider = { id: string; kind: "claude" | "claude-api" | "codex"; name: string; priority: number; enabled: boolean; hasSecret: boolean; info: Info };
type Login = { status: "aguardando-link" | "aguardando-codigo" | "aguardando-site" | "conferindo" | "pronto" | "falhou"; url?: string; code?: string; message?: string };

const KIND: Record<Provider["kind"], string> = { claude: "Claude · assinatura", "claude-api": "Claude · chave de API", codex: "ChatGPT · Codex" };
const fmt = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "";

function status(p: Provider): { dot: string; text: string } {
  const limited = p.info.limitedUntil && p.info.limitedUntil > new Date().toISOString();
  if (!p.enabled) return { dot: "dot--off", text: "desligada" };
  if (limited) return { dot: "dot--alert", text: `no limite até ${fmt(p.info.limitedUntil)} (Brasília)` };
  if (p.info.loggedIn) return { dot: "", text: ["conectada", p.info.email, p.info.plan].filter(Boolean).join(" · ") };
  if (p.info.loggedIn === false) return { dot: "dot--alert", text: p.info.detail ? `não conectada · ${p.info.detail}` : "não conectada" };
  return { dot: "dot--off", text: "ainda não conferida" };
}

function LoginBox({ p, onDone }: { p: Provider; onDone: () => void }) {
  const [login, setLogin] = useState<Login | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
  };
  useEffect(() => stop, []);

  async function start() {
    setError("");
    try {
      const r = await api<{ login: Login }>(`/api/provedores/${p.id}/login`, { method: "POST" });
      setLogin(r.login);
      stop();
      poll.current = setInterval(async () => {
        const s = await api<{ login: Login | null }>(`/api/provedores/${p.id}/login`).catch(() => null);
        if (!s?.login) return;
        setLogin(s.login);
        if (s.login.status === "pronto" || s.login.status === "falhou") {
          stop();
          onDone();
        }
      }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível começar.");
    }
  }

  async function send() {
    setError("");
    try {
      const r = await api<{ login: Login }>(`/api/provedores/${p.id}/login`, { method: "PUT", body: { code } });
      setLogin(r.login);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código não aceito.");
    }
  }

  if (!login)
    return (
      <>
        <button type="button" className="btn btn--sm" onClick={() => void start()}>
          {p.info.loggedIn ? "Entrar de novo" : "Entrar"}
        </button>
        {error ? <p className="notice">{error}</p> : null}
      </>
    );

  return (
    <div className="approval" data-testid={`login-${p.id}`}>
      {login.status === "aguardando-link" ? <p>Abrindo o login oficial…</p> : null}
      {login.status === "aguardando-codigo" && login.url ? (
        <>
          <p>
            <strong>1.</strong> Abra o login da Anthropic, entre na conta que quer ligar e copie o código que aparece no fim.
          </p>
          <a className="btn btn--sm" href={login.url} target="_blank" rel="noopener noreferrer">
            Abrir login da Anthropic
          </a>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor={`code-${p.id}`}>
              Código da Anthropic
            </label>
            <input id={`code-${p.id}`} className="field field--sm" style={{ flex: "1 1 220px" }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="2. Cole o código aqui" autoComplete="off" />
            <button className="btn btn--sm" disabled={!code.trim()}>
              Conectar
            </button>
          </form>
          <p className="small muted">O código vai direto para o Claude Code oficial desta máquina; a Central não guarda.</p>
        </>
      ) : null}
      {login.status === "aguardando-site" && login.url ? (
        <>
          <p>
            Abra o site da OpenAI, entre na conta do ChatGPT e digite este código (vale 15 min):
          </p>
          <p className="title" style={{ fontFamily: "var(--mono)", letterSpacing: "0.08em" }} data-testid="device-code">
            {login.code}
          </p>
          <a className="btn btn--sm" href={login.url} target="_blank" rel="noopener noreferrer">
            Abrir site da OpenAI
          </a>
          <p className="small muted">Esta tela confere sozinha quando você terminar.</p>
        </>
      ) : null}
      {login.status === "conferindo" ? <p>Conferindo o login…</p> : null}
      {login.status === "pronto" ? <p>Conectada: {login.message}</p> : null}
      {login.status === "falhou" ? <p className="notice">Não conectou: {login.message}</p> : null}
      {error ? <p className="notice">{error}</p> : null}
      {login.status !== "pronto" ? (
        <button
          type="button"
          className="link small"
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", justifySelf: "start" }}
          onClick={async () => {
            stop();
            await api(`/api/provedores/${p.id}/login`, { method: "DELETE" }).catch(() => undefined);
            setLogin(null);
          }}
        >
          cancelar
        </button>
      ) : null}
    </div>
  );
}

export function ProvidersPanel() {
  const [list, setList] = useState<Provider[] | null>(null);
  const [failover, setFailoverState] = useState(true);
  const [codexInstalled, setCodexInstalled] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [kind, setKind] = useState("claude");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ providers: Provider[]; failover: boolean; codexInstalled: boolean }>("/api/provedores");
    setList(r.providers);
    setFailoverState(r.failover);
    setCodexInstalled(r.codexInstalled);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Não carregou."));
  }, [load]);

  async function act(id: string, what: string, fn: () => Promise<unknown>) {
    setBusy(`${id}:${what}`);
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

  async function add() {
    const apiKind = kind === "codex-key" ? "codex" : kind;
    await act("novo", "criar", async () => {
      await api("/api/provedores", { body: { kind: apiKind, name, apiKey: kind.endsWith("api") || kind === "codex-key" ? key : "" } });
      setName("");
      setKey("");
    });
  }

  const needsKey = kind === "claude-api" || kind === "codex-key";

  return (
    <div className="stack stack--lg">
      <label className="row" style={{ gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={failover}
          onChange={async (e) => {
            const on = e.target.checked;
            setFailoverState(on);
            await api("/api/provedores", { body: { failover: on } }).catch(() => setFailoverState(!on));
          }}
        />
        <span>Trocar de conta Claude sozinho quando uma bater o limite de uso</span>
      </label>

      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="list" aria-label="Provedores">
        {(list ?? []).map((p, i) => {
          const st = status(p);
          return (
            <li key={p.id} data-testid={`provider-${p.id}`}>
              <div className="list__item" style={{ gap: 10 }}>
                <div className="row row--between">
                  <div className="row" style={{ gap: 10 }}>
                    <span className="tag">{i + 1}º</span>
                    <span className="list__title">{p.name}</span>
                    <span className="small muted">{KIND[p.kind]}</span>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button type="button" className="btn btn--ghost btn--sm" aria-label={`Subir ${p.name}`} disabled={i === 0 || !!busy} onClick={() => void act(p.id, "mover", () => api(`/api/provedores/${p.id}`, { method: "PATCH", body: { move: -1 } }))}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      aria-label={`Descer ${p.name}`}
                      disabled={i === (list?.length ?? 1) - 1 || !!busy}
                      onClick={() => void act(p.id, "mover", () => api(`/api/provedores/${p.id}`, { method: "PATCH", body: { move: 1 } }))}
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <p className="row small" style={{ gap: 8 }}>
                  <span className={`dot ${st.dot}`} aria-hidden="true" />
                  <span data-testid="status">{st.text}</span>
                  {p.info.checkedAt ? <span className="muted">· conferida {fmt(p.info.checkedAt)}</span> : null}
                </p>
                <div className="row" style={{ gap: 6 }}>
                  {p.kind !== "claude-api" ? <LoginBox p={p} onDone={() => void load()} /> : null}
                  <button type="button" className="btn btn--ghost btn--sm" disabled={!!busy} onClick={() => void act(p.id, "testar", () => api(`/api/provedores/${p.id}/testar`, { method: "POST" }))}>
                    {busy === `${p.id}:testar` ? "Conferindo…" : "Conferir"}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={!!busy} onClick={() => void act(p.id, "ligar", () => api(`/api/provedores/${p.id}`, { method: "PATCH", body: { enabled: !p.enabled } }))}>
                    {p.enabled ? "Desligar" : "Ligar"}
                  </button>
                  {p.id !== "maquina" && p.kind !== "claude-api" && p.info.loggedIn ? (
                    <button type="button" className="btn btn--ghost btn--sm" disabled={!!busy} onClick={() => void act(p.id, "sair", () => api(`/api/provedores/${p.id}/sair`, { method: "POST" }))}>
                      Sair da conta
                    </button>
                  ) : null}
                  {p.id !== "maquina" ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={!!busy}
                      onClick={() => {
                        if (window.confirm(`Remover ${p.name}? O login dela nesta máquina é apagado.`)) void act(p.id, "remover", () => api(`/api/provedores/${p.id}`, { method: "DELETE" }));
                      }}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {list === null ? <p className="muted">Carregando…</p> : null}

      <section className="stack" aria-labelledby="novo-provedor">
        <h2 className="h2" id="novo-provedor">
          Adicionar
        </h2>
        <form
          className="stack"
          style={{ maxWidth: 520 }}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label className="label" htmlFor="p-kind">
            Tipo
          </label>
          <select id="p-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="claude">Outra conta Claude (assinatura)</option>
            <option value="codex" disabled={!codexInstalled}>
              ChatGPT (assinatura, pelo Codex){codexInstalled ? "" : " · Codex não instalado"}
            </option>
            <option value="claude-api">Chave de API da Anthropic</option>
            <option value="codex-key" disabled={!codexInstalled}>
              Chave de API da OpenAI (pelo Codex)
            </option>
          </select>
          <label className="label" htmlFor="p-name">
            Nome
          </label>
          <input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "claude" ? "ex.: Claude · conta 2" : kind.startsWith("codex") ? "ex.: ChatGPT Plus" : "ex.: API Anthropic"} />
          {needsKey ? (
            <>
              <label className="label" htmlFor="p-key">
                Chave
              </label>
              <input id="p-key" className="field" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={kind === "claude-api" ? "sk-ant-…" : "sk-…"} />
              <p className="small muted">Fica cifrada nesta máquina e não aparece de novo depois de salva.</p>
            </>
          ) : (
            <p className="small muted">Depois de adicionar, toque em Entrar: o login é o oficial da {kind === "claude" ? "Anthropic" : "OpenAI"}.</p>
          )}
          <button className="btn" disabled={busy === "novo:criar" || (needsKey && !key.trim())}>
            {busy === "novo:criar" ? "Adicionando…" : "Adicionar"}
          </button>
        </form>
      </section>

      <section className="stack small muted" style={{ maxWidth: 680 }}>
        <p>
          <strong>Como cada um é usado.</strong> As contas Claude rodam a triagem e os agentes, na ordem acima. O ChatGPT roda quando você põe uma conversa nele (menu ⋯ do
          chat), sempre só leitura: ele não escreve arquivo nem roda comando que altere algo. Nesta VPS o sandbox do Codex não sobe, então ele só conversa (com o banco de
          contexto no pedido); no desktop ele também lê a pasta.
        </p>
        <p>Cada conta Claude tem a própria janela de uso: com duas, a troca automática segura o trabalho quando uma acaba.</p>
      </section>
    </div>
  );
}
