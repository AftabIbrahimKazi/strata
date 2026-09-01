import Link from "next/link";
import Logo from "./Logo";
import WaveRule from "./WaveRule";

const COLUMNS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: "Docs",
    links: [
      { label: "Introduction", href: "/docs" },
      { label: "Installation", href: "/guides/installation" },
      { label: "Configuration", href: "/guides/configuration" },
      { label: "Utilities", href: "/utilities/spacing" },
    ],
  },
  {
    heading: "Packages",
    links: [
      { label: "All Packages", href: "/#packages" },
      { label: "Forms", href: "https://www.npmjs.com/package/@strata-packages/forms", external: true },
      { label: "Modal", href: "https://www.npmjs.com/package/@strata-packages/modal", external: true },
      { label: "Chart", href: "https://www.npmjs.com/package/@strata-packages/chart", external: true },
    ],
  },
  {
    heading: "GitHub",
    links: [
      { label: "Repository", href: "https://github.com/AftabIbrahimKazi/strata", external: true },
      { label: "Issues", href: "https://github.com/AftabIbrahimKazi/strata/issues", external: true },
      { label: "Pull Requests", href: "https://github.com/AftabIbrahimKazi/strata/pulls", external: true },
      { label: "Discussions", href: "https://github.com/AftabIbrahimKazi/strata/discussions", external: true },
    ],
  },
  {
    heading: "npm",
    links: [
      { label: "strata-css", href: "https://www.npmjs.com/package/strata-css", external: true },
      { label: "Releases", href: "https://github.com/AftabIbrahimKazi/strata/releases", external: true },
      { label: "Changelog", href: "/policies/changelog" },
    ],
  },
];

const POLICY_LINKS = [
  { label: "License", href: "/policies/license" },
  { label: "Contributing", href: "/policies/contributing" },
  { label: "Changelog", href: "/policies/changelog" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/policies/privacy" },
  { label: "Terms", href: "/policies/terms" },
];

export default function Footer() {
  return (
    <footer className="p-4 position-relative">
      <WaveRule />
      <div className="container">
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Logo size={22} />
              <span className="fw-bold">strata</span>
            </div>
            <p className="text-muted mb-0">JIT CSS Framework. Built for modern UI.</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="col-6 col-md-2">
              <p className="fw-semibold mb-2">{col.heading}</p>
              <ul className="list-unstyled">
                {col.links.map((link) => (
                  <li key={link.label} className="mb-1">
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted text-link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-muted text-link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-3 position-relative d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
          <WaveRule />
          <div className="d-flex flex-wrap gap-3">
            {POLICY_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="text-muted text-link">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-3">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="text-muted text-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
