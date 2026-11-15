import { ProvidersPanel } from "@/components/ProvidersPanel";

export const metadata = { title: "Provedores" };

export default function ProvedoresPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Provedores</h1>
          <p className="muted" style={{ maxWidth: 680 }}>
            Contas que a Central usa para rodar os agentes. A ordem da lista é a ordem de uso: quando uma conta Claude bate o limite, a próxima assume. O ChatGPT entra quando
            você escolhe ele numa conversa (menu ⋯).
          </p>
        </header>
        <ProvidersPanel />
      </div>
    </main>
  );
}
