"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { api } from "./api";

type Passkey = { id: string; name: string; created: string; lastUsed: string };

export function AccountPanel({ passkeys, sessions, secure }: { passkeys: Passkey[]; sessions: number; secure: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function addPasskey(form: FormData) {
    setError("");
    setBusy(true);
    try {
      const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/auth/passkey/register/options", { method: "POST" });
      const response = await startRegistration({ optionsJSON });
      await api("/api/auth/passkey/register/verify", { body: { response, name: form.get("name") } });
      window.location.reload();
    } catch (e) {
      const name = (e as { name?: string }).name;
      setError(name === "NotAllowedError" ? "Criação da passkey cancelada." : name === "InvalidStateError" ? "Este aparelho já tem uma passkey da Central." : e instanceof Error ? e.message : "Não foi possível criar a passkey.");
      setBusy(false);
    }
  }

  return (
    <div className="stack stack--lg">
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}

      <section className="stack" aria-labelledby="passkeys">
        <h2 className="h2" id="passkeys">
          Passkeys
        </h2>
        {!secure ? <p className="notice">Passkey só funciona em HTTPS ou em localhost. Nesta URL, use senha + código.</p> : null}
        {passkeys.length ? (
          <ul className="list">
            {passkeys.map((p) => (
              <li key={p.id}>
                <div className="list__item">
                  <div className="row row--between">
                    <span className="list__title">{p.name}</span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={async () => {
                        if (!window.confirm(`Remover a passkey "${p.name}"?`)) return;
                        await api(`/api/auth/passkey/${encodeURIComponent(p.id)}`, { method: "DELETE" }).catch((e) => setError(e.message));
                        window.location.reload();
                      }}
                    >
                      Remover
                    </button>
                  </div>
                  <span className="small muted">
                    criada em {p.created} · {p.lastUsed ? `último uso ${p.lastUsed}` : "ainda não usada"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma passkey. Com uma, você entra com a digital ou o rosto, sem senha.</p>
        )}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void addPasskey(new FormData(e.currentTarget));
          }}
        >
          <label className="sr-only" htmlFor="pk-name">
            Nome do aparelho
          </label>
          <input className="field" id="pk-name" name="name" placeholder="Nome do aparelho (ex.: iPhone)" style={{ maxWidth: 280 }} required />
          <button className="btn" disabled={busy || !secure}>
            {busy ? "Aguardando o aparelho…" : "Criar passkey"}
          </button>
        </form>
      </section>

      <section className="stack" aria-labelledby="sessoes">
        <h2 className="h2" id="sessoes">
          Sessões
        </h2>
        <p className="muted">
          {sessions} {sessions === 1 ? "sessão ativa (esta)" : "sessões ativas"}. Cada uma vale 30 dias.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={sessions < 2}
            onClick={async () => {
              await api("/api/auth/sessions", { method: "DELETE" }).catch((e) => setError(e.message));
              window.location.reload();
            }}
          >
            Encerrar as outras
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
              window.location.href = "/entrar";
            }}
          >
            Sair
          </button>
        </div>
      </section>
    </div>
  );
}
