import Link from "next/link";
import { getRoadmapItems } from "@/lib/roadmap";

const TEASER_COUNT = 4;

export default function Roadmap() {
  const items = getRoadmapItems();
  if (!items.length) return null;

  const teaser = items.slice(0, TEASER_COUNT);

  return (
    <section className="container py-4">
      <h2 className="mb-1">What&apos;s Next</h2>
      <p className="text-muted mb-3">A look at what we&apos;re building next.</p>

      <div className="list-group mb-3">
        {teaser.map((item) => (
          <div
            key={item.slug}
            id={item.slug}
            className="list-group-item d-flex align-items-center justify-content-between gap-3"
          >
            <div>
              <p className="fw-semibold mb-1">
                {item.relatedHref ? (
                  <Link href={item.relatedHref} className="text-decoration-none">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </p>
              <p className="text-muted mb-0">{item.value}</p>
            </div>
            <span className="roadmap-status-badge flex-shrink-0 d-inline-flex align-items-center gap-2">
              <span className="roadmap-status-dot" aria-hidden="true" />
              {item.badge}
            </span>
          </div>
        ))}
      </div>

      {items.length > TEASER_COUNT && (
        <Link href="/roadmap" className="text-link">
          See the full roadmap &rarr;
        </Link>
      )}
    </section>
  );
}
