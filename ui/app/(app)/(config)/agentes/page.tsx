import { AgentsPanel } from "@/components/AgentsPanel";

export const metadata = { title: "Agentes" };

export default function AgentesPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Agentes</h1>
          <p className="lead">Quem faz o trabalho. A triagem escolhe o agente de cada pedido; aqui você cria, edita, pausa e conversa direto com um deles.</p>
        </header>
        <AgentsPanel />
      </div>
    </main>
  );
}
