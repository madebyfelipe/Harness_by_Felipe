import { ConnectorsPanel } from "@/components/ConnectorsPanel";
import { listAgents } from "@/lib/repo";

export const metadata = { title: "Conectores" };

export default function ConectoresPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">Um arquivo por conector em connectors/</p>
          <h1 className="title">Conectores</h1>
          <p className="lead">Estado de cada sistema e um botão para testar. O arquivo guarda só o nome do segredo.</p>
        </header>
        <ConnectorsPanel agents={listAgents().map((a) => a.name)} />
      </div>
    </main>
  );
}
