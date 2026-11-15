"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";
import { api } from "./api";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "passkey" | "senha">("");

  async function withPasskey() {
    setError("");
    setBusy("passkey");
    try {
      const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/auth/passkey/login/options", { method: "POST" });
      const response = await startAuthentication({ optionsJSON });
      await api("/api/auth/passkey/login/verify", { body: { response } });
      window.location.href = "/";
    } catch (e) {
      const name = (e as { name?: string }).name;
      setError(name === "NotAllowedError" ? "Passkey cancelada." : e instanceof Error ? e.message : "Não foi possível entrar com a passkey.");
      setBusy("");
    }
  }

  async function withPassword(form: FormData) {
    setError("");
    setBusy("senha");
    try {
      await api("/api/auth/login", { body: { password: form.get("password"), code: form.get("code") } });
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
      setBusy("");
    }
  }

  return (
    <div className="stack stack--lg">
      <button type="button" className="btn btn--block" onClick={withPasskey} disabled={busy !== ""}>
        {busy === "passkey" ? "Aguardando a passkey…" : "Entrar com passkey"}
      </button>
      <hr className="rule" />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void withPassword(new FormData(e.currentTarget));
        }}
      >
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input className="field" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <label className="label" htmlFor="code">
            Código do app autenticador
          </label>
          <input className="field" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6 dígitos, ou um código de recuperação" required />
        </div>
        {error ? (
          <p className="notice" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--ghost btn--block" disabled={busy !== ""}>
          {busy === "senha" ? "Entrando…" : "Entrar com senha"}
        </button>
      </form>
    </div>
  );
}
