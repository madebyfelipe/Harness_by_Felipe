"use client";

import { useState } from "react";
import { api } from "./api";

type Pending = { pendingId: string; secret: string; qrSvg: string };

export function SetupForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState<Pending | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(form: FormData) {
    setError("");
    if (form.get("password") !== form.get("password2")) return setError("As duas senhas não são iguais.");
    setBusy(true);
    try {
      setPending(await api<Pending>("/api/setup/start", { body: { token: form.get("token"), name: form.get("name"), password: form.get("password") } }));
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(form: FormData) {
    setError("");
    setBusy(true);
    try {
      const r = await api<{ recoveryCodes: string[] }>("/api/setup/confirm", { body: { pendingId: pending!.pendingId, code: form.get("code") } });
      setCodes(r.recoveryCodes);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setBusy(false);
    }
  }

  const alert = error ? (
    <p className="notice" role="alert">
      {error}
    </p>
  ) : null;

  if (step === 1) {
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void start(new FormData(e.currentTarget));
        }}
      >
        <p className="kicker">Passo 1 de 3 · conta</p>
        <div>
          <label className="label" htmlFor="token">
            Token de configuração
          </label>
          <input className="field" id="token" name="token" autoComplete="off" required aria-describedby="token-help" />
          <p className="small muted" id="token-help" style={{ marginTop: 6 }}>
            Está no arquivo <code>~/.central/setup-token</code> da máquina que roda a Central. Prova que é você.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="name">
            Seu nome
          </label>
          <input className="field" id="name" name="name" autoComplete="name" defaultValue="Felipe" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha (12 caracteres ou mais)
          </label>
          <input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        </div>
        <div>
          <label className="label" htmlFor="password2">
            Repita a senha
          </label>
          <input className="field" id="password2" name="password2" type="password" autoComplete="new-password" minLength={12} required />
        </div>
        {alert}
        <button className="btn btn--block" disabled={busy}>
          {busy ? "Conferindo…" : "Continuar"}
        </button>
      </form>
    );
  }

  if (step === 2 && pending) {
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm(new FormData(e.currentTarget));
        }}
      >
        <p className="kicker">Passo 2 de 3 · segundo fator</p>
        <p>Abra o app autenticador (Google Authenticator, 1Password, Authy…) e leia o código.</p>
        <div className="qr" role="img" aria-label="QR code do segundo fator" dangerouslySetInnerHTML={{ __html: pending.qrSvg }} />
        <details className="fold">
          <summary>Não consigo ler o QR</summary>
          <p className="mono" style={{ overflowWrap: "anywhere" }}>
            {pending.secret}
          </p>
        </details>
        <div>
          <label className="label" htmlFor="code">
            Código de 6 dígitos que o app mostra
          </label>
          <input className="field" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus />
        </div>
        {alert}
        <button className="btn btn--block" disabled={busy}>
          {busy ? "Confirmando…" : "Confirmar e criar a conta"}
        </button>
      </form>
    );
  }

  return (
    <div className="stack stack--lg">
      <p className="kicker">Passo 3 de 3 · códigos de recuperação</p>
      <p>Guarde estes códigos fora desta máquina. Cada um entra uma vez no lugar do código do app. Eles não aparecem de novo.</p>
      <div className="codes" data-testid="recovery-codes">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <a className="btn btn--block" href="/conta?primeira=1">
        Guardei. Abrir a Central
      </a>
    </div>
  );
}
