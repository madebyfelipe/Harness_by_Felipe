"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="rail__btn"
      aria-label={`Mudar para o tema ${next === "dark" ? "escuro" : "claro"}`}
      title={`Tema ${next === "dark" ? "escuro" : "claro"}`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("central-theme", next);
        } catch {
          /* navegação privada */
        }
        setTheme(next);
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 2a7 7 0 0 1 0 14z" fill="currentColor" />
      </svg>
    </button>
  );
}
