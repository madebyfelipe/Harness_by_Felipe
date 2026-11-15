"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "./api";
import { FeedbackButton } from "./FeedbackButton";
import { IconBot, IconChat, IconCheck, IconClock, IconFolder, IconGear, IconList, IconPanel, IconPlug, IconPlus } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

/*
 * Celular: gaveta lateral no lugar da faixa de ícones e das abas de baixo,
 * como no app do OpenBot. Abre pelo botão redondo de painel (DrawerButton).
 */

const OPEN_EVENT = "central:gaveta";

export function openDrawer() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Botão redondo que abre a gaveta (só aparece no celular). */
export function DrawerButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`mround mround--menu ${className}`} aria-label="Abrir menu" onClick={openDrawer}>
      <IconPanel />
    </button>
  );
}

type Row = { href: string; label: string; icon: (p: { size?: number }) => React.ReactElement; on: (p: string) => boolean; extra?: string };

export function MobileDrawer({ mode }: { mode: "vps" | "local" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const o = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, o);
    return () => window.removeEventListener(OPEN_EVENT, o);
  }, []);
  // Trocou de tela: fecha.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    api<{ pending: unknown[] }>("/api/aprovacoes")
      .then((r) => setPending(r.pending.length))
      .catch(() => undefined);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const rows: Row[] = [
    { href: "/", label: "Nova conversa", icon: IconPlus, on: (p) => p === "/" },
    { href: "/chat", label: "Conversas", icon: IconChat, on: (p) => p.startsWith("/chat") },
    { href: "/projetos", label: "Projetos", icon: IconFolder, on: (p) => p.startsWith("/projetos") },
    { href: "/aprovacoes", label: "Aprovações", icon: IconCheck, on: (p) => p.startsWith("/aprovacoes"), extra: pending ? `${pending} pendente${pending > 1 ? "s" : ""}` : "" },
    { href: "/rotinas", label: "Rotinas", icon: IconClock, on: (p) => p.startsWith("/rotinas") },
    { href: "/agentes", label: "Agentes", icon: IconBot, on: (p) => p.startsWith("/agentes") },
    { href: "/conectores", label: "Apps", icon: IconPlug, on: (p) => p.startsWith("/conectores") },
    { href: "/registros", label: "Registros e uso", icon: IconList, on: (p) => p.startsWith("/registros") }
  ];

  return (
    <div className={`mdrawer${open ? " mdrawer--open" : ""}`} aria-hidden={!open}>
      <button type="button" className="mdrawer__shade" aria-label="Fechar menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <nav className="mdrawer__panel" aria-label="Menu" inert={!open}>
        <div className="mdrawer__head">
          <span className="mdrawer__logo" aria-hidden="true">
            C<i />
          </span>
          <span className="mdrawer__who">
            <strong>Central</strong>
            <span>
              <i className="mdrawer__on" aria-hidden="true" /> {mode === "vps" ? "VPS · online" : "Nesta máquina"}
            </span>
          </span>
          <Link className="mround" href="/" aria-label="Nova conversa">
            <IconPlus />
          </Link>
        </div>
        <ul className="mdrawer__list">
          {rows.map(({ href, label, icon: Icon, on, extra }) => (
            <li key={href}>
              <Link href={href} aria-current={on(pathname) ? "page" : undefined}>
                <Icon size={22} />
                <span>{label}</span>
                {extra ? <em>{extra}</em> : null}
              </Link>
            </li>
          ))}
        </ul>
        <hr className="mdrawer__rule" />
        <ul className="mdrawer__list">
          <li>
            <Link href="/configuracoes" aria-current={pathname === "/configuracoes" ? "page" : undefined}>
              <IconGear size={22} />
              <span>Configurações</span>
            </Link>
          </li>
        </ul>
        <div className="mdrawer__foot">
          <span className="mdrawer__avatar" aria-hidden="true">
            F
          </span>
          <span className="mdrawer__user">
            <strong>Felipe</strong>
            <span>Made by Felipe</span>
          </span>
          <FeedbackButton />
          <ThemeToggle />
        </div>
      </nav>
    </div>
  );
}
