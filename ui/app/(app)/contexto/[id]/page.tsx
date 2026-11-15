import { notFound } from "next/navigation";
import { ChatView } from "@/components/ChatView";
import { getConversation, listMessages } from "@/lib/chat";
import { MODELS } from "@/lib/models";
import { activeRun } from "@/lib/runner";

export const metadata = { title: "Modo Contexto" };

export default async function ContextoChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation || conversation.mode !== "contexto") notFound();
  return (
    <main className="main main--flush">
      <ChatView
        initial={{ conversation, messages: await listMessages(id), active: activeRun(id) }}
        models={MODELS.map(({ id: mid, label, note }) => ({ id: mid, label, note }))}
        agentLabel="Modo Contexto"
        backHref="/contexto"
      />
    </main>
  );
}
