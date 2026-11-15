"use client";

export type MentionItem = { kind: "projeto" | "agente" | "conector"; tag: string; label: string; hint: string };

const KIND: Record<MentionItem["kind"], string> = { projeto: "Projeto", agente: "Agente", conector: "Conector" };

export function filterMentions(items: MentionItem[], q: string): MentionItem[] {
  const n = q.toLowerCase();
  return items.filter((i) => !n || i.tag.toLowerCase().includes(n) || i.label.toLowerCase().includes(n)).slice(0, 8);
}

/** Lista do @ no compositor: projetos, agentes e conectores. */
export function MentionMenu({ items, active, onPick, onHover }: { items: MentionItem[]; active: number; onPick: (i: MentionItem) => void; onHover: (n: number) => void }) {
  return (
    <ul className="mention" role="listbox" aria-label="Chamar com @">
      {items.length ? (
        items.map((i, n) => (
          <li key={`${i.kind}:${i.tag}`}>
            <button
              type="button"
              role="option"
              aria-selected={n === active}
              className="mention__opt"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(i);
              }}
              onMouseEnter={() => onHover(n)}
            >
              <span className={`mention__kind mention__kind--${i.kind}`}>{KIND[i.kind]}</span>
              <strong>@{i.tag}</strong>
              <span className="mention__hint">{i.label !== i.tag ? i.label : i.hint}</span>
            </button>
          </li>
        ))
      ) : (
        <li className="mention__none small muted">Nada com esse nome. Crie projetos na tela Projetos.</li>
      )}
    </ul>
  );
}
