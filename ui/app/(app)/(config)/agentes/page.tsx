import { NewChatButton } from "@/components/NewChat";
import { allowedFor, listConnectors } from "@/lib/connectors";
import { modelLabel } from "@/lib/models";
import { listAgents } from "@/lib/repo";

export const metadata = { title: "Agentes" };

const CORES = ["#bc0319", "#24292F", "#673DE6", "#0079BF", "#2C7A4B", "#B45309", "#6B21A8", "#0F766E", "#9D174D"];

export default function AgentesPage() {
  const agents = listAgents();
  const { connectors } = listConnectors();
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Agentes</h1>
          <p className="lead">Quem faz o trabalho. A triagem escolhe o agente de cada pedido; aqui você conversa direto com um deles. Criar e editar entram na próxima fase.</p>
        </header>
        {agents.length ? (
          <ul className="cards">
            {agents.map((a, i) => {
              const mine = connectors.filter((c) => allowedFor(c, a.name)).map((c) => c.titulo);
              return (
                <li key={a.name} className="card" data-testid={`agente-${a.name}`}>
                  <div className="card__row">
                    <span className="card__icon" style={{ background: CORES[i % CORES.length] }} aria-hidden="true">
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="card__text">
                      <span className="card__name">
                        {a.name} <span className="tag">{modelLabel(a.model)}</span>
                      </span>
                      <span className="card__desc">{a.description}</span>
                    </div>
                    <NewChatButton mode="chat" agent={a.name} label="Conversar" ghost small />
                  </div>
                  <details className="fold card__detail">
                    <summary>Detalhes</summary>
                    <p className="mono small muted">
                      {a.file} · ferramentas: {a.tools.length ? a.tools.join(", ") : "todas"} · apps: {mine.length ? mine.join(", ") : "nenhum"}
                    </p>
                    <pre className="pre">{a.prompt}</pre>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="notice">Não achei agentes em agents/. Confira CENTRAL_REPO_DIR.</p>
        )}
      </div>
    </main>
  );
}
