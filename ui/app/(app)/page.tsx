import { ChatView } from "@/components/ChatView";
import { MODELS } from "@/lib/models";

export const metadata = { title: "Chat" };

/** Abriu a Central = chat pronto, microfone à vista. A conversa nasce no primeiro envio. */
export default function Home() {
  return (
    <main className="main main--flush">
      <ChatView initial={{ conversation: null, messages: [], active: null }} models={MODELS.map(({ id, label, note }) => ({ id, label, note }))} backHref="/chat" />
    </main>
  );
}
