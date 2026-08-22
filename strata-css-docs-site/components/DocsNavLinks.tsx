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
            <Link href={`/${base}/${item.slug}`} className="text-link d-block py-1" prefetch={false}>
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DocsNavLinks() {
  return (
    <>
      <div className="mb-4">
        <Link href="/docs" className="text-link fw-semibold d-block py-1" prefetch={false}>
          Introduction
        </Link>
      </div>
      <NavGroup heading="Guides" items={guides} base="guides" />
      <NavGroup heading="Utilities" items={utilities.map((u) => ({ slug: u.slug, title: u.title }))} base="utilities" />
      <NavGroup heading="Components" items={components.map((c) => ({ slug: c.slug, title: c.title }))} base="components" />
    </>
  );
}
