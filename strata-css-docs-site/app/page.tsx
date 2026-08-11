import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1 className="fw-bold mb-3">Strata CSS</h1>
      <p className="text-muted mb-4">
        A JIT CSS framework. You write class names in your markup — Strata scans your source,
        looks each class up in its registry, and emits only the CSS you actually use.
      </p>
      <div className="d-flex gap-2">
        <Link href="/guides/installation" className="btn-primary">
          Get Started
        </Link>
        <Link href="/utilities/spacing" className="btn-outline-secondary">
          Browse Utilities
        </Link>
      </div>
    </div>
  );
}
