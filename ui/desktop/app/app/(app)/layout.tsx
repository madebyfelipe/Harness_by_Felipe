import { ListColumn } from "@/components/ListColumn";
import { Rail, TabNav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { cfg } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Faixa de ícones · coluna de conversas · conteúdo, como no OpenBot. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <div className="app">
        <Rail />
        <ListColumn initialMode={cfg().mode} />
        {children}
      </div>
      <TabNav />
    </>
  );
}
