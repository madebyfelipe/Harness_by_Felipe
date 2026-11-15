import Link from "next/link";
import { ContextSearch } from "@/components/ContextSearch";
import { ArchiveButton, NewChatButton } from "@/components/NewChat";
import { listConversations } from "@/lib/chat";
import { fmtBrasilia } from "@/lib/config";
import { listContextFiles } from "@/lib/repo";

export const metadata = { title: "Contexto" };

export default async function ContextoPage() {
  const files = listContextFiles();
  const asked = await listConversations("contexto", 10);
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">Banco de contexto</p>
          <h1 className="title">Contexto</h1>
          <p className="lead">Perguntas respondidas só com os arquivos .md deste repositório, com o arquivo citado. O que não estiver lá, ele diz que não está.</p>
          <div className="row">
            <NewChatButton mode="contexto" label="Fazer uma pergunta" />
          </div>
        </header>

        <ContextSearch />

        {asked.length ? (
          <section className="stack" aria-labelledby="perguntas">
            <h2 className="h2" id="perguntas">
              Perguntas anteriores
            </h2>
            <ul className="list">
              {asked.map((c) => (
                <li key={c.id}>
                  <div className="row row--between">
                    <Link className="list__item" href={`/contexto/${c.id}`} style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <span className="list__title">{c.title}</span>
                      <span className="small muted">{fmtBrasilia(c.updated_at)}</span>
                    </Link>
                    <ArchiveButton id={c.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="stack" aria-labelledby="arquivos">
          <h2 className="h2" id="arquivos">
            {files.length} arquivos
          </h2>
          <ul className="list">
            {files.map((f) => (
              <li key={f.file}>
                <Link className="list__item" href={`/contexto/arquivo?f=${encodeURIComponent(f.file)}`}>
                  <span className="list__title">{f.title}</span>
                  <span className="mono muted">
                    {f.file} · {Math.max(1, Math.round(f.size / 1024))} KB
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
