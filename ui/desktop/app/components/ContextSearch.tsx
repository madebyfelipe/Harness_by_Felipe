"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

type Hit = { file: string; line: number; text: string; heading: string };

/** Busca literal nos .md, sem modelo: resposta na hora e sem custo. */
export function ContextSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api<{ hits: Hit[] }>(`/api/contexto/busca?q=${encodeURIComponent(term)}`)
        .then((r) => alive && setHits(r.hits))
        .catch(() => alive && setHits([]));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="stack">
      <div>
        <label className="label" htmlFor="busca">
          Buscar nos arquivos
        </label>
        <input className="field" id="busca" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: preço site, art. 20, janela 05:30" autoComplete="off" />
      </div>
      {hits ? (
        hits.length ? (
          <ul className="list" aria-label="Resultados">
            {hits.map((h) => (
              <li key={`${h.file}:${h.line}`}>
                <a className="list__item" href={`/contexto/arquivo?f=${encodeURIComponent(h.file)}#L${h.line}`}>
                  <span className="mono muted">
                    {h.file}:{h.line}
                    {h.heading ? ` · ${h.heading}` : ""}
                  </span>
                  <span>{h.text}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nada encontrado nos arquivos.</p>
        )
      ) : null}
    </div>
  );
}
