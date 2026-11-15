import { ChatView } from "@/components/ChatView";
import { MODELS } from "@/lib/models";
import { getProject } from "@/lib/projects";

export const metadata = { title: "Chat" };

/** Abriu a Central = chat pronto, microfone à vista. A conversa nasce no primeiro envio. */
export default async function Home({ searchParams }: { searchParams: Promise<{ projeto?: string; texto?: string }> }) {
  const { projeto, texto } = await searchParams;
  const project = projeto ? await getProject(projeto) : undefined;
  return (
    <main className="main main--flush">
      <ChatView
        key={project?.id ?? "novo"}
        initial={{ conversation: null, messages: [], active: null }}
        models={MODELS.map(({ id, label, note }) => ({ id, label, note }))}
        backHref="/chat"
        projectId={project?.id ?? null}
        initialText={typeof texto === "string" ? texto.slice(0, 4000) : ""}
      />
    </main>
  );
}
