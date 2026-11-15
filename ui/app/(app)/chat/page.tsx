import { ConversationList } from "@/components/ConversationList";
import { cfg } from "@/lib/config";

export const metadata = { title: "Conversas" };

export default function ChatListPage() {
  return (
    <main className="main main--flush">
      <ConversationList initialMode={cfg().mode} page />
    </main>
  );
}
