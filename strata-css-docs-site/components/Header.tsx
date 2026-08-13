import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="navbar border-bottom p-3 d-flex align-items-center justify-content-between gap-3">
      <Link href="/" className="navbar-brand fw-bold text-decoration-none d-flex align-items-center gap-2">
        <Logo />
        strata
      </Link>

      <div className="d-none d-md-flex flex-fill max-w-[420px]">
        <input
          type="search"
          placeholder="Search documentation..."
          aria-label="Search documentation"
          className="form-control"
        />
      </div>

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
