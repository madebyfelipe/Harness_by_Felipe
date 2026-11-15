"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";

type Win = { status: string; usedPct?: number; resetsAt?: string; at: string };
type P = { id: string; kind: string; name: string; enabled: boolean; info: { email?: string; loggedIn?: boolean; limitedUntil?: string; usage?: Record<string, Win> } };

const LABEL: Record<string, string> = { five_hour: "5 horas", seven_day: "Semana", seven_day_opus: "Semana · Opus", seven_day_sonnet: "Semana · Sonnet", overage: "Uso extra" };
const ORDER = ["five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet", "overage"];

function until(iso?: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Janelas ainda válidas de uma conta (a que já virou é descartada). */
function windows(p: P): { key: string; label: string; left: number | null; reset: string }[] {
  const out: { key: string; label: string; left: number | null; reset: string }[] = [];
  const usage = p.info.usage ?? {};
  for (const key of ORDER) {
    const w = usage[key];
    if (!w) continue;
    const reset = until(w.resetsAt);
    if (w.resetsAt && !reset) continue;
    out.push({ key, label: LABEL[key] ?? key, left: typeof w.usedPct === "number" ? 100 - w.usedPct : null, reset });
  }
  const lim = until(p.info.limitedUntil);
  if (lim && !out.some((w) => w.left === 0)) out.unshift({ key: "limite", label: "No limite", left: 0, reset: lim });
  return out;
}

function Ring({ left }: { left: number | null }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const frac = left === null ? 1 : left / 100;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className={`ring ${left !== null && left <= 10 ? "ring--low" : ""} ${left === null ? "ring--unknown" : ""}`}>
      <circle cx="13" cy="13" r={r} className="ring__track" />
      <circle cx="13" cy="13" r={r} className="ring__fill" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 13 13)" />
    </svg>
  );
}

/** Faixa lateral: um anel por conta de IA, com o quanto resta de cada janela de uso. */
export function UsageMeter() {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const [list, setList] = useState<P[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ providers: P[] }>("/api/provedores")
        .then((r) => alive && setList(r.providers.filter((p) => p.enabled && p.kind === "claude")))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!list.length) return null;
  const rows = list.map((p) => ({ p, w: windows(p) }));
  const worst = (w: ReturnType<typeof windows>) => (w.some((x) => x.left !== null) ? Math.min(...w.filter((x) => x.left !== null).map((x) => x.left as number)) : null);

  return (
    <details className="pop usage" ref={ref}>
      <summary className="rail__btn usage__btn" aria-label="Uso das contas de IA" title="Uso das contas de IA">
        {rows.slice(0, 3).map(({ p, w }) => (
          <Ring key={p.id} left={worst(w)} />
        ))}
      </summary>
      <div className="pop__panel pop__panel--up usage__panel" role="dialog" aria-label="Uso das contas de IA">
        <p className="h2">Uso</p>
        {rows.map(({ p, w }) => (
          <div className="usage__acct" key={p.id} data-testid={`uso-${p.id}`}>
            <p className="small">
              <strong>Claude · {p.info.email || p.name}</strong>
            </p>
            {w.length ? (
              w.map((x) => (
                <div className="usage__row" key={x.key}>
                  <span className="small muted">{x.label}</span>
                  <span className="usage__bar" aria-hidden="true">
                    <i style={{ width: `${x.left ?? 100}%` }} className={x.left !== null && x.left <= 10 ? "low" : x.left === null ? "unknown" : ""} />
                  </span>
                  <span className={`small usage__left ${x.left !== null && x.left <= 10 ? "usage__left--low" : ""}`}>{x.left === null ? "folgado" : `${x.left}% livre`}</span>
                  <span className="small muted usage__reset">{x.reset}</span>
                </div>
              ))
            ) : (
              <p className="small muted">Sem leitura ainda: aparece depois da próxima conversa nesta conta.</p>
            )}
          </div>
        ))}
        <p className="small muted">O Claude só informa a porcentagem quando a conta chega perto do limite; antes disso aparece "folgado".</p>
      </div>
    </details>
  );
}
