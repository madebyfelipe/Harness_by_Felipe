"use client";

import { useState } from "react";
import { api } from "./api";

/** Cria a conversa e abre. `agent` vazio = orquestrador. */
export function NewChatButton({ mode, agent, label, ghost, small }: { mode: "chat" | "contexto"; agent?: string; label: string; ghost?: boolean; small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className={`btn${ghost ? " btn--ghost" : ""}${small ? " btn--sm" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await api<{ conversation: { id: string } }>("/api/chat", { body: { mode, agent } });
            window.location.href = `/${mode === "contexto" ? "contexto" : "chat"}/${r.conversation.id}`;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível criar.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Abrindo…" : label}
      </button>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function ArchiveButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={async () => {
        if (!window.confirm("Arquivar esta conversa? Ela sai da lista.")) return;
        await api(`/api/chat/${id}`, { method: "DELETE" }).catch(() => undefined);
        window.location.reload();
      }}
    >
      Arquivar
    </button>
  );
}
