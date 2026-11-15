"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

type Chip = { icon: string; label: string; text: string };

/* Ícones das sugestões (a IA escolhe pelo nome). */
const ICON: Record<string, string> = {
  spark: "M10 3l1.5 3.5L15 8l-3.5 1.5L10 13l-1.5-3.5L5 8l3.5-1.5z M15.5 13l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z",
  users: "M7.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4 M13 9a2 2 0 1 0 0-4 M14 12c1.8.3 3 1.6 3 4",
  chat: "M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M7 8h6 M7 10.5h4",
  plus: "M10 4v12 M4 10h12",
  calendar: "M4 6a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 16 6v8.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5z M4 8.5h12 M7.5 3v3 M12.5 3v3",
  whatsapp: "M10 3.5a6.5 6.5 0 0 0-5.6 9.8L3.5 16.5l3.3-.9A6.5 6.5 0 1 0 10 3.5z",
  bolt: "M11 3 5 11h5l-1 6 6-8h-5z",
  code: "M7 6l-4 4 4 4 M13 6l4 4-4 4",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M13.5 13.5 17 17",
  doc: "M5 3h7l3 3v11H5z M12 3v3h3 M7.5 10h5 M7.5 13h5",
  image: "M3.5 4.5h13v11h-13z M3.5 13l4-4 3 3 2-2 4 4 M13 8a1 1 0 1 0 0-.01",
  check: "M4 10.5l4 4 8-9"
};

/* Reserva enquanto não há sugestão gerada: preenchem a caixa (não enviam). */
const CHIPS: Chip[] = [
  { icon: "M10 3l1.5 3.5L15 8l-3.5 1.5L10 13l-1.5-3.5L5 8l3.5-1.5z M15.5 13l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z", label: "Resumir meu dia", text: "Resuma meu dia: o que rodou, o que ficou pendente e as 3 coisas que só eu posso fazer hoje." },
  { icon: "M7.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4 M13 9a2 2 0 1 0 0-4 M14 12c1.8.3 3 1.6 3 4", label: "Leads para qualificar", text: "Quais leads estão esperando qualificação? Liste com o próximo passo de cada um." },
  { icon: "M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M7 8h6 M7 10.5h4", label: "Conversas em aberto", text: "Quais conversas com clientes e leads estão em aberto esperando resposta minha?" },
  { icon: "M10 4v12 M4 10h12", label: "Criar contato", text: "Crie um contato no CRM: " },
  { icon: "M5 5h4v4H5z M11 11h4v4h-4z M9 7h3a2 2 0 0 1 2 2v2", label: "Nova oportunidade", text: "Crie uma oportunidade no CRM para " },
  { icon: "M4 6a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 16 6v8.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5z M4 8.5h12 M7.5 3v3 M12.5 3v3", label: "Agendar reunião", text: "Agende uma reunião com " },
  { icon: "M10 3.5a6.5 6.5 0 0 0-5.6 9.8L3.5 16.5l3.3-.9A6.5 6.5 0 1 0 10 3.5z", label: "Mandar WhatsApp", text: "Prepare uma mensagem de WhatsApp para " },
  { icon: "M11 3 5 11h5l-1 6 6-8h-5z", label: "Criar automação", text: "Crie uma rotina que " }
];

function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Tela inicial do chat: data e fila, saudação e atalhos em pílula. */
export function Welcome({ projectName, onPick }: { projectName?: string; onPick: (text: string) => void }) {
  const [hello, setHello] = useState("Olá");
  const [day, setDay] = useState("");
  const [fila, setFila] = useState<number | null>(null);
  const [sug, setSug] = useState<Chip[] | null>(null);

  useEffect(() => {
    setHello(saudacao());
    setDay(new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date()).replace(/\./g, ""));
    // Sugestões a partir das últimas conversas (geradas em segundo plano, com cache).
    let tries = 0;
    const loadSug = () =>
      api<{ items: { icon: string; label: string; text: string }[]; updating: boolean }>("/api/sugestoes")
        .then((r) => {
          if (r.items.length) setSug(r.items.map((i) => ({ icon: ICON[i.icon] ?? ICON.spark, label: i.label, text: i.text })));
          else setSug([]);
          if (r.updating && tries++ < 3) setTimeout(loadSug, 8000);
        })
        .catch(() => setSug([]));
    loadSug();
    api<{ conversations: { running?: boolean }[] }>("/api/chat?view=lista")
      .then((r) => setFila(r.conversations.filter((c) => c.running).length))
      .catch(() => setFila(null));
  }, []);

  return (
    <div className="welcome">
      <p className="welcome__kicker">
        {day}
        {fila !== null ? ` · ${fila ? `${fila} ${fila === 1 ? "tarefa rodando" : "tarefas rodando"}` : "nenhuma tarefa na fila"}` : ""}
      </p>
      <h1 className="welcome__title">
        {hello}, Felipe.
        <span>{projectName ? `O que vamos fazer em ${projectName}?` : "O que vamos fazer hoje?"}</span>
      </h1>
      <ul className="welcome__chips">
        {(sug && sug.length ? sug : sug ? CHIPS.slice(0, 6) : []).map((c) => (
          <li key={c.label}>
            <button type="button" className="wchip" onClick={() => onPick(c.text)}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={c.icon} />
              </svg>
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="welcome__tip small muted">
        <code>@</code> chama projeto, agente ou conector · <code>fb:</code> anota feedback · fale pelo microfone na caixa
      </p>
    </div>
  );
}
