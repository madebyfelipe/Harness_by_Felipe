"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { IconFeedback } from "./Icons";

type Sent = "bom" | "ruim" | "ideia";

/** Envia um feedback para feedback.md. `onde` diz de onde veio (tela, agente, entrega). */
export async function sendFeedback(sentimento: Sent, onde: string, texto = ""): Promise<void> {
  await api("/api/feedback", { body: { sentimento, onde, texto } });
}

/** Botão fixo (faixa lateral): bom · ruim · comentar, com o lugar gravado junto. */
export function FeedbackButton() {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"" | "busy" | "ok" | string>("");

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function go(s: Sent) {
    setState("busy");
    try {
      await sendFeedback(s, `Central · tela ${pathname} · ${document.title}`, text);
      setText("");
      setState("ok");
      setTimeout(() => {
        setState("");
        if (ref.current) ref.current.open = false;
      }, 1200);
    } catch (e) {
      setState(e instanceof Error ? e.message : "Não consegui gravar.");
    }
  }

  return (
    <details className="pop" ref={ref}>
      <summary className="rail__btn" aria-label="Dar feedback" title="Feedback">
        <IconFeedback />
      </summary>
      <div className="pop__panel pop__panel--up" role="dialog" aria-label="Feedback">
        <strong>Feedback desta tela</strong>
        <p className="small muted">Vai para feedback.md com o lugar onde você está.</p>
        <label className="sr-only" htmlFor="fb-text">
          Comentário
        </label>
        <textarea id="fb-text" className="field field--sm" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="O que achou? (opcional em bom/ruim)" />
        <div className="row">
          <button type="button" className="btn btn--sm" disabled={state === "busy"} onClick={() => void go("bom")}>
            Bom
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={state === "busy"} onClick={() => void go("ruim")}>
            Ruim
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={state === "busy" || !text.trim()} onClick={() => void go("ideia")}>
            Comentar
          </button>
        </div>
        {state === "ok" ? <p className="small">Anotado.</p> : state && state !== "busy" ? <p className="notice">{state}</p> : null}
      </div>
    </details>
  );
}
