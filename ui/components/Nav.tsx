"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Início", tab: true },
  { href: "/chat", label: "Chat", tab: true },
  { href: "/contexto", label: "Contexto", tab: true },
  { href: "/agentes", label: "Agentes", tab: true },
  { href: "/skills", label: "Skills", tab: false },
  { href: "/conectores", label: "Conectores", tab: true },
  { href: "/conta", label: "Conta", tab: false }
];

function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="side" aria-label="Seções">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isCurrent(pathname, i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
      <p className="side__foot small muted">Fase 1 · Base</p>
    </nav>
  );
}

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Seções">
      {ITEMS.filter((i) => i.tab).map((i) => (
        <Link key={i.href} href={i.href} aria-current={isCurrent(pathname, i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
