import { AppsCatalog } from "@/components/AppsCatalog";
import { listAgents } from "@/lib/repo";

export const metadata = { title: "Apps" };

export default function AppsPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Apps</h1>
          <p className="lead">Conecte as ferramentas e os serviços com que seus agentes trabalham.</p>
        </header>
        <AppsCatalog agents={listAgents().map((a) => a.name)} />
      </div>
    </main>
  );
}
