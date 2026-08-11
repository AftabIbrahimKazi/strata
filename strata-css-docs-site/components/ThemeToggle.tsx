"use client";

import { useEffect, useState } from "react";

const THEMES = ["light", "dim", "dark"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && THEMES.includes(stored)) setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-st-theme", next);
  }

  return (
    <div className="d-flex gap-1" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          aria-pressed={theme === t}
          className={theme === t ? "btn-primary btn-sm" : "btn-outline-secondary btn-sm"}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
