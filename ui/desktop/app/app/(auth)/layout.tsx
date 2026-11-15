import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gate">
      <header className="bar">
        <span className="wordmark">
          Central <i aria-hidden="true" />
        </span>
        <span className="bar__spacer" />
        <ThemeToggle />
      </header>
      <main className="gate__body">{children}</main>
    </div>
  );
}
