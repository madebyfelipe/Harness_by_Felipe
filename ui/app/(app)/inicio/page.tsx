import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/chat";
import { fmtBrasilia } from "@/lib/config";
import { lastStatuses, listConnectors } from "@/lib/connectors";
import { getDb } from "@/lib/db";
import { listAgents, listContextFiles, listSkills } from "@/lib/repo";
import { getStatus } from "@/lib/status";

export const metadata = { title: "Painel" };

export default async function InicioPage() {
  const user = await requireUser();
  const db = await getDb();
  const [status, recent, statuses, pending] = await Promise.all([
    getStatus(),
    listConversations("todas", 5),
    lastStatuses(),
    db.get<{ n: number }>("SELECT COUNT(*) AS n FROM approvals WHERE status = 'pending'")
  ]);
  const { connectors } = listConnectors();
  const waiting = Number(pending?.n ?? 0);
  const hoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">{hoje}</p>
          <h1 className="title">Bom te ver, {user.name.split(" ")[0]}.</h1>
          <div className="row">
            <Link className="btn" href="/">
              Falar com a Central
            </Link>
            <Link className="btn btn--ghost" href="/contexto">
              Perguntar ao contexto
            </Link>
          </div>
        </header>

        {!status.repoHealth.ok ? (
          <p className="notice" role="alert">
            Repositório de configuração com problema: {status.repoHealth.problems.join("; ")}.
          </p>
        ) : null}

        <section className="grid" aria-label="Estado da Central">
          <div className="cell">
            <span className="kicker">Precisa de você</span>
            <span className="cell__value">{waiting}</span>
            <span className="small muted">{waiting ? "pedidos de aprovação esperando no chat" : "nenhuma aprovação pendente"}</span>
          </div>
          <div className="cell">
            <span className="kicker">Agentes rodando</span>
            <span className="cell__value">{status.running}</span>
            <span className="small muted">modelo via {status.modelAuth}</span>
          </div>
          <div className="cell">
            <span className="kicker">Worker</span>
            <span className="cell__value">{status.worker ? "online" : "offline"}</span>
            <span className="small muted">
              modo {status.mode === "vps" ? "VPS" : "local"}
              {status.lastWorker && !status.worker && status.lastWorker.last_seen_at > "2000" ? ` · visto ${fmtBrasilia(status.lastWorker.last_seen_at)}` : ""}
              {!status.lastWorker ? " · rode npm run worker" : ""}
            </span>
          </div>
          <div className="cell">
            <span className="kicker">Configuração</span>
            <span className="cell__value">{status.repo ? status.repo.commit : "—"}</span>
            <span className="small muted">
              {status.repo ? `${status.repo.branch} · ${status.repo.subject.slice(0, 48)}${status.repo.dirty ? ` · ${status.repo.dirty} arquivo(s) sem commit` : ""}` : "git indisponível"}
            </span>
          </div>
        </section>

        <section className="stack" aria-labelledby="conectores">
          <div className="row row--between">
            <h2 className="h2" id="conectores">
              Saúde dos conectores
            </h2>
            <Link className="link small" href="/conectores">
              testar e adicionar
            </Link>
          </div>
          {connectors.length ? (
            <ul className="list">
              {connectors.map((c) => {
                const s = statuses[c.nome];
                return (
                  <li key={c.nome}>
                    <div className="list__item">
                      <div className="row">
                        <span className={`dot ${!s ? "dot--off" : s.ok ? "" : "dot--alert"}`} aria-hidden="true" />
                        <span className="list__title">{c.titulo}</span>
                      </div>
                      <span className="small muted">{s ? `${s.ok ? "funcionando" : "com problema"} · ${s.detail} · ${fmtBrasilia(s.checked_at)}` : "ainda não testado"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Nenhum conector em connectors/.</p>
          )}
        </section>

        <section className="stack" aria-labelledby="recentes">
          <div className="row row--between">
            <h2 className="h2" id="recentes">
              Conversas recentes
            </h2>
            <Link className="link small" href="/chat">
              todas
            </Link>
          </div>
          {recent.length ? (
            <ul className="list">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link className="list__item" href={`/${c.mode === "contexto" ? "contexto" : "chat"}/${c.id}`}>
                    <span className="list__title">{c.title}</span>
                    <span className="small muted">
                      {c.agent} · {fmtBrasilia(c.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhuma conversa ainda.</p>
          )}
        </section>

        <section className="stack" aria-labelledby="repo">
          <h2 className="h2" id="repo">
            O que a Central leu do repositório
          </h2>
          <div className="tags">
            <Link className="tag" href="/agentes">
              {listAgents().length} agentes
            </Link>
            <Link className="tag" href="/skills">
              {listSkills().length} skills
            </Link>
            <Link className="tag" href="/contexto">
              {listContextFiles().length} arquivos de contexto
            </Link>
            <Link className="tag" href="/conectores">
              {connectors.length} conectores
            </Link>
          </div>
          <p className="small muted">Briefing do dia (vendas + site) e rotinas de hoje entram nas Fases 3 e 5.</p>
        </section>
      </div>
    </main>
  );
}
