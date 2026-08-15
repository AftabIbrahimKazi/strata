import { notFound } from "next/navigation";
import type { Metadata } from "next";
import utilities from "@/content/utilities.json";
import Playground from "@/components/Playground";

// Slugs with their own dedicated route (app/(docs)/utilities/<slug>/page.tsx) —
// their content outgrew this template's single-paragraph description into real
// prose sections, so they're excluded here to avoid a duplicate/conflicting path.
const DEDICATED_SLUGS = [
  "spacing",
  "display",
  "flexbox",
  "grid",
  "sizing",
  "typography",
  "colors",
  "borders",
  "position",
  "misc",
  "arbitrary-values",
];

export function generateStaticParams() {
  return utilities.filter((u) => !DEDICATED_SLUGS.includes(u.slug)).map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = utilities.find((u) => u.slug === slug);
  if (!entry) return {};
  return {
    title: `${entry.title} Utilities`,
    description: entry.description,
    alternates: { canonical: `/utilities/${slug}` },
  };
}

export default async function UtilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = utilities.find((u) => u.slug === slug);
  if (!entry) notFound();

  return (
    <div>
      <h1 className="fw-bold mb-2">{entry.title}</h1>
      <p className="text-muted mb-4">{entry.description}</p>

      {entry.groups.map((group) => (
        <section key={group.heading} className="mb-5">
          <h2 className="mb-3">{group.heading}</h2>
          <Playground
            classes={group.classes}
            bare={Boolean((group as { bare?: boolean }).bare)}
            multi={(group as { multi?: boolean }).multi ?? true}
          />
          <div className="d-flex flex-wrap gap-2">
            {group.classes.map((cls) => (
              <code key={cls} className="badge-light">
                {cls}
              </code>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
