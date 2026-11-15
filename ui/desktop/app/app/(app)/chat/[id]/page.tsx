import { notFound } from "next/navigation";
import { ChatView } from "@/components/ChatView";
import { getConversation, listMessages } from "@/lib/chat";
import { MODELS } from "@/lib/models";
import { activeRun } from "@/lib/runner";

export const metadata = { title: "Conversa" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation || conversation.mode !== "chat") notFound();
  return (
    <main className="main main--flush">
      <ChatView
        initial={{ conversation, messages: await listMessages(id), active: activeRun(id) }}
        models={MODELS.map(({ id: mid, label, note }) => ({ id: mid, label, note }))}
        backHref="/chat"
      />
    </main>
  );
}
