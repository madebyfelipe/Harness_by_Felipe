import { RoutinesPanel } from "@/components/RoutinesPanel";
import { listAgents } from "@/lib/repo";

export const metadata = { title: "Rotinas" };

export default function RotinasPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Rotinas</h1>
          <p className="lead">Rotina é rotina: roda sozinha e reporta depois. Os arquivos ficam em routines/*.yaml.</p>
        </header>
        <RoutinesPanel agents={listAgents().map((a) => a.name)} />
      </div>
    </main>
  );
}
