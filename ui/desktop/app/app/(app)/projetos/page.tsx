import { ProjectsView } from "@/components/ProjectsView";

export const metadata = { title: "Projetos" };

export default function ProjetosPage() {
  return (
    <main className="main">
      <div className="page">
        <ProjectsView />
      </div>
    </main>
  );
}
