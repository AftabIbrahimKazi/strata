import { getRoadmapItems } from "@/lib/roadmap";

export default function Roadmap() {
  const items = getRoadmapItems();
  if (!items.length) return null;

  return (
    <section className="container py-4">
      <h2 className="mb-1">What&apos;s Next</h2>
      <p className="text-muted mb-3">A look at what we&apos;re building next.</p>

      <div className="list-group">
        {items.map((item) => (
          <div
            key={item.title}
            className="list-group-item d-flex align-items-center justify-content-between gap-3"
          >
            <div>
              <p className="fw-semibold mb-1">{item.title}</p>
              <p className="text-muted mb-0">{item.value}</p>
            </div>
            <span className="badge-primary flex-shrink-0">Planned</span>
          </div>
        ))}
      </div>
    </section>
  );
}
