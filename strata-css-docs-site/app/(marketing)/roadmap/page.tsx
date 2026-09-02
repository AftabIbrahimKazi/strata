import type { Metadata } from "next";
import Link from "next/link";
import { getRoadmapItems } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What's planned next for Strata CSS — candidate features under consideration, from critical CSS extraction to native browser popup primitives.",
  alternates: { canonical: "/roadmap" },
};

export default function RoadmapPage() {
  const items = getRoadmapItems();

  return (
    <div className="container py-5 max-w-[720px]">
      <h1 className="fw-bold mb-2">Roadmap</h1>
      <p className="text-muted mb-4">
        Candidate features under consideration. Not commitments — an item graduates to a release
        once work actually starts. See the <Link href="/policies/changelog">changelog</Link> for
        what has already shipped.
      </p>

      <div className="list-group">
        {items.map((item) => (
          <div key={item.slug} id={item.slug} className="list-group-item">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-1">
              <p className="fw-semibold mb-0">
                {item.relatedHref ? (
                  <Link href={item.relatedHref} className="text-decoration-none">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </p>
              <span className="roadmap-status-badge flex-shrink-0 d-inline-flex align-items-center gap-2">
                <span className="roadmap-status-dot" aria-hidden="true" />
                {item.badge}
              </span>
            </div>
            <p className="text-muted mb-0">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
