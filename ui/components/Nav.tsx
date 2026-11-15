"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FeedbackButton } from "./FeedbackButton";
import { IconChat, IconGear } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

const CONFIG = ["/inicio", "/provedores", "/conectores", "/agentes", "/skills", "/rotinas", "/contexto", "/conta"];
const isConfig = (p: string) => CONFIG.some((c) => p === c || (p.startsWith(c + "/") && !/^\/contexto\/[0-9a-f-]{36}$/.test(p)));
const isChat = (p: string) => p === "/" || p.startsWith("/chat") || /^\/contexto\/[0-9a-f-]{36}$/.test(p);

/** Faixa à esquerda: só o Chat; o resto mora em Configurações. */
export function Rail() {
  const pathname = usePathname();
  return (
    <nav className="rail" aria-label="Seções">
      <Link className="rail__logo" href="/" aria-label="Central, nova conversa">
        C<i aria-hidden="true" />
      </Link>
      <Link className="rail__btn" href="/" aria-label="Chat" title="Chat" aria-current={isChat(pathname) ? "page" : undefined}>
        <IconChat />
      </Link>
      <span className="rail__spacer" />
      <FeedbackButton />
      <ThemeToggle />
      <Link className="rail__btn" href="/inicio" aria-label="Configurações" title="Configurações" aria-current={isConfig(pathname) ? "page" : undefined}>
        <IconGear />
      </Link>
    </nav>
  );
}

/** No celular: abas embaixo. */
export function TabNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "Falar", on: pathname === "/" },
    { href: "/chat", label: "Conversas", on: pathname.startsWith("/chat") || /^\/contexto\/[0-9a-f-]{36}$/.test(pathname) },
    { href: "/inicio", label: "Configurações", on: isConfig(pathname) }
  ];
  return (
    <nav className="tabs" aria-label="Seções">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
