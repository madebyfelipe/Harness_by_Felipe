import { listSkills } from "@/lib/repo";

export const metadata = { title: "Skills" };

export default function SkillsPage() {
  const skills = listSkills();
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">Lidas de skills/*/SKILL.md</p>
          <h1 className="title">Skills</h1>
          <p className="lead">Procedimentos que qualquer agente segue. Criar, editar e versionar entram na Fase 2.</p>
        </header>
        {skills.length ? (
          <ul className="list">
            {skills.map((s) => (
              <li key={s.name}>
                <div className="list__item">
                  <span className="list__title">{s.name}</span>
                  <p className="muted">{s.description}</p>
                  <p className="mono muted">{s.file}</p>
                  <details className="fold">
                    <summary>Conteúdo</summary>
                    <pre className="pre">{s.body}</pre>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma skill em skills/.</p>
        )}
      </div>
    </main>
  );
}
