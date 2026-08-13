const TOOLS = [
  { name: "npm", label: "Package registry", href: "https://www.npmjs.com/package/strata-css" },
  { name: "GitHub", label: "Source & CI", href: "https://github.com/AftabIbrahimKazi/strata" },
  { name: "Socket", label: "Supply-chain scanning", href: "https://socket.dev" },
  { name: "Snyk", label: "Vulnerability monitoring", href: "https://snyk.io" },
  { name: "CodeQL", label: "Static analysis", href: "https://codeql.github.com" },
];

export default function Ecosystem() {
  return (
    <section className="container py-4">
      <h2 className="mb-3">Built and monitored with</h2>
      <div className="row g-3">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="col-6 col-md-4 col-lg-2">
            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card h-100 text-decoration-none text-center"
            >
              <div className="card-body">
                <p className="fw-semibold mb-1">{tool.name}</p>
                <p className="text-muted mb-0">{tool.label}</p>
              </div>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
