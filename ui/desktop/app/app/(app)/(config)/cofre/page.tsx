import { VaultPanel } from "@/components/VaultPanel";

export const metadata = { title: "Cofre" };

export default function CofrePage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Cofre</h1>
          <p className="lead">Chaves, tokens e senhas, cifrados. O valor nunca aparece depois de salvo; o agente usa pelo nome e só se estiver no escopo.</p>
        </header>
        <VaultPanel />
      </div>
    </main>
  );
}
