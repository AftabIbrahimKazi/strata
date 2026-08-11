import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="navbar border-bottom p-3 d-flex align-items-center justify-content-between">
      <Link href="/" className="navbar-brand fw-bold text-decoration-none">
        Strata CSS
      </Link>
      <div className="d-flex align-items-center gap-3">
        <a
          href="https://github.com/AftabIbrahimKazi/strata"
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
