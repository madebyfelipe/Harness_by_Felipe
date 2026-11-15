import Link from "next/link";
import { ModeSelector } from "@/components/ModeSelector";
import { SideNav, TabNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireUser } from "@/lib/auth";
import { cfg } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <header className="bar">
        <Link className="wordmark" href="/">
          Central <i aria-hidden="true" />
        </Link>
        <span className="bar__spacer" />
        <ModeSelector initialMode={cfg().mode} />
        <ThemeToggle />
        <Link className="icon-btn" href="/conta" aria-label="Conta">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="6" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 16c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </Link>
      </header>
      <div className="shell">
        <SideNav />
        {children}
      </div>
      <TabNav />
    </>
  );
}
