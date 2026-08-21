import guides from "@/content/guides.json";
import utilities from "@/content/utilities.json";
import components from "@/content/components.json";

export type DocNavEntry = {
  href: string;
  title: string;
  description?: string;
  group: "Introduction" | "Guides" | "Utilities" | "Components";
};

export const docNav: DocNavEntry[] = [
  { href: "/docs", title: "Introduction", group: "Introduction" },
  ...guides.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, group: "Guides" as const })),
  ...utilities.map((u) => ({
    href: `/utilities/${u.slug}`,
    title: u.title,
    description: u.description,
    group: "Utilities" as const,
  })),
  ...components.map((c) => ({
    href: `/components/${c.slug}`,
    title: c.title,
    description: c.description,
    group: "Components" as const,
  })),
];
