import Link from "next/link";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    title: "Layered by Design",
    body: "Built on the concept of layers, working with the CSS cascade instead of fighting it.",
  },
  {
    title: "JIT Engine",
    body: "A blazing-fast JIT engine that generates only the CSS you actually use.",
  },
  {
    title: "Component First",
    body: "Pre-built components you can customize and extend, or drop in as-is.",
  },
  {
    title: "Framework Agnostic",
    body: "Works with any framework — or even vanilla HTML, no build-tool lock-in.",
  },
];

export default function DocsHome() {
  return (
    <div>
      <span className="badge-primary d-inline-block mb-3">Introduction</span>
      <h1 className="fw-bold mb-3">Welcome to Strata CSS</h1>
      <p className="text-muted mb-4">
        A JIT CSS framework that combines the power of component-driven design with the
        flexibility of utility-first classes — all working with the natural cascade.
      </p>
      <div className="d-flex gap-2 mb-5">
        <Link href="/guides/installation" className="btn-primary">
          Get Started
        </Link>
        <a
          href="https://github.com/AftabIbrahimKazi/strata"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-secondary d-flex align-items-center gap-2"
        >
          View on GitHub
        </a>
      </div>

      <div className="row g-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="col-12 col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="mb-2">
                  <Logo size={22} />
                </div>
                <h3 className="card-title">{f.title}</h3>
                <p className="card-text text-muted mb-0">{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
