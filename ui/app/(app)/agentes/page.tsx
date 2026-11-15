import { NewChatButton } from "@/components/NewChat";
import { allowedFor, listConnectors } from "@/lib/connectors";
import { modelLabel } from "@/lib/models";
import { listAgents } from "@/lib/repo";

export const metadata = { title: "Agentes" };

export default function AgentesPage() {
  const agents = listAgents();
  const { connectors } = listConnectors();
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">Lidos de agents/*.md</p>
          <h1 className="title">Agentes</h1>
          <p className="lead">O orquestrador planeja e delega; os outros executam. Criar, editar e importar do OpenBot entram na Fase 2.</p>
        </header>
        {agents.length ? (
          <ul className="list">
            {agents.map((a) => {
              const mine = connectors.filter((c) => allowedFor(c, a.name)).map((c) => c.titulo);
              return (
                <li key={a.name} data-testid={`agente-${a.name}`}>
                  <div className="list__item">
                    <div className="row row--between">
                      <div className="row">
                        <span className="list__title">{a.name}</span>
                        <span className="tag">{modelLabel(a.model)}</span>
                        {a.isOrchestrator ? <span className="tag">sessão principal</span> : null}
                      </div>
                      <NewChatButton mode="chat" agent={a.name} label="Conversar" ghost small />
                    </div>
                    <p className="muted">{a.description}</p>
                    <p className="mono muted">
                      {a.file} · ferramentas: {a.tools.length ? a.tools.join(", ") : "todas"} · conectores: {mine.length ? mine.join(", ") : "nenhum"}
                    </p>
                    <details className="fold">
                      <summary>Prompt</summary>
                      <pre className="pre">{a.prompt}</pre>
                    </details>
                  </div>
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
