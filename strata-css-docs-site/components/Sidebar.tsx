import Link from "next/link";
import guides from "@/content/guides.json";
import utilities from "@/content/utilities.json";
import components from "@/content/components.json";

function NavGroup({ heading, items, base }: { heading: string; items: { slug: string; title: string }[]; base: string }) {
  return (
    <div className="mb-4">
      <p className="fw-semibold text-muted mb-2">{heading}</p>
      <ul className="list-unstyled">
        {items.map((item) => (
          <li key={item.slug} className="mb-1">
            <Link href={`/${base}/${item.slug}`} className="text-decoration-none d-block py-1">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="d-none d-lg-block w-[240px] flex-shrink-0 border-end p-3 overflow-y-auto position-sticky top-0 min-vh-100">
      <div className="mb-4">
        <Link href="/docs" className="text-decoration-none fw-semibold d-block py-1">
          Introduction
        </Link>
      </div>
      <NavGroup heading="Guides" items={guides} base="guides" />
      <NavGroup heading="Utilities" items={utilities.map((u) => ({ slug: u.slug, title: u.title }))} base="utilities" />
      <NavGroup heading="Components" items={components.map((c) => ({ slug: c.slug, title: c.title }))} base="components" />
    </aside>
  );
}
