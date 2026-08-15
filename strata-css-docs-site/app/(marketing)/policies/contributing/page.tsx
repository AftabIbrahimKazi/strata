import type { Metadata } from "next";
import { renderRepoMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Contributing",
  description: "How to contribute to Strata CSS — branch pipeline, commit format, and versioning rules.",
  alternates: { canonical: "/policies/contributing" },
};

export default function ContributingPage() {
  const html = renderRepoMarkdown("CONTRIBUTING.md");
  return (
    <div className="container py-5 max-w-[720px] prose-links" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
