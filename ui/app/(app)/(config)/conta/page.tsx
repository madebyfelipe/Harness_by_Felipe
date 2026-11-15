import { AccountPanel } from "@/components/AccountPanel";
import { requireUser } from "@/lib/auth";
import { cfg, fmtBrasilia } from "@/lib/config";
import { getDb } from "@/lib/db";
import { listPasskeys } from "@/lib/webauthn";

export const metadata = { title: "Conta" };

export default async function ContaPage({ searchParams }: { searchParams: Promise<{ primeira?: string }> }) {
  const user = await requireUser();
  const { primeira } = await searchParams;
  const db = await getDb();
  const passkeys = await listPasskeys(user.id);
  const sessions = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?", [user.id, new Date().toISOString()]);
  const left = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL", [user.id]);
  const url = cfg().publicUrl;
  const secure = url.protocol === "https:" || url.hostname === "localhost";
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <p className="kicker">{user.name}</p>
          <h1 className="title">Conta</h1>
          {primeira ? <p className="notice notice--plain">Conta criada. Próximo passo: criar uma passkey neste aparelho, para entrar sem senha.</p> : null}
          <p className="muted">
            Segundo fator ligado · {Number(left?.n ?? 0)} códigos de recuperação sobrando · endereço {url.origin}
          </p>
        </header>
        <AccountPanel
          secure={secure}
          sessions={Number(sessions?.n ?? 1)}
          passkeys={passkeys.map((p) => ({ id: p.id, name: p.name, created: fmtBrasilia(p.created_at), lastUsed: p.last_used_at ? fmtBrasilia(p.last_used_at) : "" }))}
        />
      </div>
    </main>
  );
}
