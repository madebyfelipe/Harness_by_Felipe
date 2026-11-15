"use client";

import { usePathname } from "next/navigation";
import { ConversationList } from "./ConversationList";

/** A coluna de conversas aparece no chat (computador); nas outras telas, o conteúdo ocupa tudo. */
export function ListColumn({ initialMode }: { initialMode: "vps" | "local" }) {
  const pathname = usePathname();
  const show = pathname === "/" || pathname.startsWith("/projetos") || /^\/(chat|contexto)\/[0-9a-f-]{36}$/.test(pathname);
  return show ? <ConversationList initialMode={initialMode} /> : null;
}
