import { ApprovalsQueue } from "@/components/ApprovalsQueue";

export const metadata = { title: "Aprovações" };

export default function AprovacoesPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Aprovações</h1>
          <p className="lead">Tudo o que um agente pediu para fazer e está esperando o seu sim, de qualquer conversa. Decidir aqui vale igual ao cartão do chat.</p>
        </header>
        <ApprovalsQueue />
      </div>
    </main>
  );
}
