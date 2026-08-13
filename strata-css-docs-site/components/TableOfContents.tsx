export default function TableOfContents({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  if (!items.length) return null;
  return (
    <nav className="d-none d-lg-block position-sticky top-0 ps-4" aria-label="On this page">
      <p className="fw-semibold text-muted mb-2">On this page</p>
      <ul className="list-unstyled">
        {items.map((item) => (
          <li key={item.id} className="mb-2">
            <a href={`#${item.id}`} className="text-link">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
