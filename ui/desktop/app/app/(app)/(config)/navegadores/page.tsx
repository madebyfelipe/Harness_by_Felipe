import { BrowsersPanel } from "@/components/BrowsersPanel";

export const metadata = { title: "Navegadores" };

export default function NavegadoresPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Navegadores</h1>
          <p className="lead">A tela de cada agente ao vivo. Assuma o controle para entrar numa conta ou resolver um bloqueio, e devolva quando terminar.</p>
        </header>
        <BrowsersPanel />
      </div>
    </main>
  );
}
