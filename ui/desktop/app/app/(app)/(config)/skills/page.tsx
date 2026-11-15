import { SkillsPanel } from "@/components/SkillsPanel";

export const metadata = { title: "Habilidades" };

export default function SkillsPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Habilidades</h1>
          <p className="lead">Procedimentos que qualquer agente segue (skills/*/SKILL.md). Crie, edite e exclua por aqui; cada mudança vira commit.</p>
        </header>
        <SkillsPanel />
      </div>
    </main>
  );
}
