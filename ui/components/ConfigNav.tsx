"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "./api";
import { IconBook, IconBot, IconClock, IconGrid, IconLayers, IconPlug, IconSpark, IconUser } from "./Icons";

const ITEMS = [
  { href: "/inicio", label: "Visão geral", icon: IconGrid },
  { href: "/provedores", label: "Provedores de IA", icon: IconLayers },
  { href: "/conectores", label: "Apps", icon: IconPlug },
  { href: "/agentes", label: "Agentes", icon: IconBot },
  { href: "/skills", label: "Habilidades", icon: IconSpark },
  { href: "/rotinas", label: "Rotinas", icon: IconClock },
  { href: "/contexto", label: "Contexto", icon: IconBook },
  { href: "/conta", label: "Conta e segurança", icon: IconUser }
];

type Mine = { nome: string; titulo: string; ok: boolean | null };

/** Barra da seção Configurações (como a "Loja" do OpenBot): itens + "Seus apps". */
export function ConfigNav() {
  const pathname = usePathname();
  const [mine, setMine] = useState<Mine[]>([]);
  useEffect(() => {
    api<{ connectors: { nome: string; titulo: string; status: { ok: number } | null; secretState: string }[] }>("/api/conectores")
      .then((r) => setMine(r.connectors.map((c) => ({ nome: c.nome, titulo: c.titulo, ok: c.secretState === "ausente" ? false : c.status ? Boolean(c.status.ok) : null }))))
      .catch(() => undefined);
  }, [pathname]);
  return (
    <nav className="cfg__nav" aria-label="Configurações">
      <p className="cfg__title">Configurações</p>
      <ul>
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}>
              <Icon size={18} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      {mine.length ? (
        <>
          <p className="cfg__group">Seus apps</p>
          <ul>
            {mine.map((m) => (
              <li key={m.nome}>
                <Link href="/conectores">
                  <span className={`dot ${m.ok === null ? "dot--off" : m.ok ? "" : "dot--alert"}`} aria-hidden="true" />
                  {m.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </nav>
  );
}
