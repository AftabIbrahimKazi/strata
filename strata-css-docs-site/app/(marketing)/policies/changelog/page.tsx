import { renderRepoMarkdown } from "@/lib/markdown";

export default function ChangelogPage() {
  const html = renderRepoMarkdown("CHANGELOG.md");
  return (
    <div className="container py-5 max-w-[720px]" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
