import { notFound } from "next/navigation";
import type { Metadata } from "next";
import components from "@/content/components.json";
import Playground from "@/components/Playground";

export function generateStaticParams() {
  return components.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = components.find((c) => c.slug === slug);
  if (!entry) return {};
  return {
    title: `${entry.title} Component`,
    description: entry.description,
    alternates: { canonical: `/components/${slug}` },
  };
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = components.find((c) => c.slug === slug);
  if (!entry) notFound();

  return (
    <div>
      <h1 className="fw-bold mb-2">{entry.title}</h1>
      <p className="text-muted mb-4">{entry.description}</p>

      {entry.groups.map((group) => (
        <section key={group.heading} className="mb-5">
          <h2 className="mb-3">{group.heading}</h2>
          <Playground classes={group.classes} multi={false} previewLabel={entry.title} />
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
