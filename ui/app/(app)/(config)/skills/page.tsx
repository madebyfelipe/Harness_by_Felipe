import { listSkills } from "@/lib/repo";

export const metadata = { title: "Habilidades" };

export default function SkillsPage() {
  const skills = listSkills();
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Habilidades</h1>
          <p className="lead">Procedimentos que qualquer agente segue (skills/*/SKILL.md). Criar, editar e versionar entram na próxima fase.</p>
        </header>
        {skills.length ? (
          <ul className="cards">
            {skills.map((s) => (
              <li key={s.name} className="card">
                <div className="card__row">
                  <span className="card__icon" style={{ background: "#454545" }} aria-hidden="true">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="card__text">
                    <span className="card__name">{s.name}</span>
                    <span className="card__desc">{s.description}</span>
                  </div>
                </div>
                <details className="fold card__detail">
                  <summary>Conteúdo</summary>
                  <p className="mono small muted">{s.file}</p>
                  <pre className="pre">{s.body}</pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma habilidade em skills/.</p>
        )}
      </div>
    </main>
  );
}
