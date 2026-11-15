"use client";

import { useRef, useState } from "react";

/** Bloco de código com o nome da linguagem e "Copiar", como no OpenBot. */
export function CodeBlock({ children, lang }: { children: React.ReactNode; lang: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <div className="code__head">
        <span>{lang || "texto"}</span>
        <button
          type="button"
          className="code__copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(ref.current?.innerText ?? "");
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* sem permissão de área de transferência */
            }
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}
