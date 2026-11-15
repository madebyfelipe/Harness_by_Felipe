import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { parseFrontmatter } from "@/lib/frontmatter";
import { readContextFile } from "@/lib/repo";

export const metadata = { title: "Arquivo" };

export default async function ArquivoPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "" } = await searchParams;
  const text = readContextFile(f);
  if (text === null) notFound();
  const { body } = parseFrontmatter(text);
  return (
    <main className="main">
      <div className="page" style={{ maxWidth: 820 }}>
        <header className="page__head">
          <Link className="link small" href="/contexto">
            ← Contexto
          </Link>
          <p className="kicker mono">{f}</p>
        </header>
        <Markdown text={body} />
      </div>
    </main>
  );
}
