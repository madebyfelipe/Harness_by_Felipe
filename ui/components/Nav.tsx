"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FeedbackButton } from "./FeedbackButton";
import { IconBook, IconBot, IconChat, IconGrid, IconLayers, IconPlug, IconSpark, IconUser } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Chat", icon: IconChat, match: ["/", "/chat"] },
  { href: "/contexto", label: "Contexto", icon: IconBook, match: ["/contexto"] },
  { href: "/agentes", label: "Agentes", icon: IconBot, match: ["/agentes"] },
  { href: "/skills", label: "Skills", icon: IconSpark, match: ["/skills"] },
  { href: "/conectores", label: "Conectores", icon: IconPlug, match: ["/conectores"] },
  { href: "/provedores", label: "Provedores de IA", icon: IconLayers, match: ["/provedores"] },
  { href: "/inicio", label: "Painel", icon: IconGrid, match: ["/inicio"] }
];

function isCurrent(pathname: string, match: string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m + "/")));
}

/** Faixa de ícones à esquerda, como no OpenBot. */
export function Rail() {
  const pathname = usePathname();
  return (
    <nav className="rail" aria-label="Seções">
      <Link className="rail__logo" href="/" aria-label="Central, nova conversa">
        C<i aria-hidden="true" />
      </Link>
      {ITEMS.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} className="rail__btn" href={href} aria-label={label} title={label} aria-current={isCurrent(pathname, match) ? "page" : undefined}>
          <Icon />
        </Link>
      ))}
      <span className="rail__spacer" />
      <FeedbackButton />
      <ThemeToggle />
      <Link className="rail__btn" href="/conta" aria-label="Conta" title="Conta" aria-current={pathname.startsWith("/conta") ? "page" : undefined}>
        <IconUser />
      </Link>
    </nav>
  );
}

/** No celular: abas embaixo. */
export function TabNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "Falar", match: ["/"] },
    { href: "/chat", label: "Conversas", match: ["/chat"] },
    { href: "/contexto", label: "Contexto", match: ["/contexto"] },
    { href: "/agentes", label: "Agentes", match: ["/agentes", "/skills", "/conectores"] },
    { href: "/inicio", label: "Painel", match: ["/inicio", "/conta", "/provedores"] }
  ];
  return (
    <nav className="tabs" aria-label="Seções">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isCurrent(pathname, t.match) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
