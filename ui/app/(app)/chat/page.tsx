import Link from "next/link";
import { ArchiveButton, NewChatButton } from "@/components/NewChat";
import { listConversations } from "@/lib/chat";
import { fmtBrasilia } from "@/lib/config";
import { modelLabel } from "@/lib/models";
import { activeRun } from "@/lib/runner";

export const metadata = { title: "Chat" };

export default async function ChatListPage() {
  const conversations = await listConversations("chat");
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">Conversar</p>
          <h1 className="title">Chat</h1>
          <div className="row">
            <NewChatButton mode="chat" label="Nova conversa com o orquestrador" />
            <Link className="btn btn--ghost" href="/agentes">
              Escolher outro agente
            </Link>
          </div>
        </header>
        {conversations.length ? (
          <ul className="list">
            {conversations.map((c) => {
              const running = activeRun(c.id)?.status === "running";
              return (
                <li key={c.id}>
                  <div className="row row--between">
                    <Link className="list__item" href={`/chat/${c.id}`} style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <span className="list__title">{c.title}</span>
                      <span className="small muted">
                        {c.agent} · {modelLabel(c.model)} · {fmtBrasilia(c.updated_at)}
                        {running ? " · rodando agora" : ""}
                      </span>
                    </Link>
                    <ArchiveButton id={c.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Nenhuma conversa ainda. Comece pelo orquestrador: ele delega para os outros agentes.</p>
        )}
      </div>
    </main>
  );
}
