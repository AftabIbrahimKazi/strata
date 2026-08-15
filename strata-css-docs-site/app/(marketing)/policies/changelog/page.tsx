import type { Metadata } from "next";
import { renderRepoMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every released version of Strata CSS, in order.",
  alternates: { canonical: "/policies/changelog" },
};

export default function ChangelogPage() {
  const html = renderRepoMarkdown("CHANGELOG.md");
  return (
    <div className="container py-5 max-w-[720px] prose-links" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
