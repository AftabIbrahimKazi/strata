import { renderRepoMarkdown } from "@/lib/markdown";

export default function ContributingPage() {
  const html = renderRepoMarkdown("CONTRIBUTING.md");
  return (
    <div className="container py-5 max-w-[720px]" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
