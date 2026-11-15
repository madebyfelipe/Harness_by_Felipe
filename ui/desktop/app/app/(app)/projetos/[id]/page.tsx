import { ProjectView } from "@/components/ProjectsView";

export const metadata = { title: "Projeto" };

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="main">
      <div className="page">
        <ProjectView id={id} />
      </div>
    </main>
  );
}
