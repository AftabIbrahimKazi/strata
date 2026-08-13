import fs from "node:fs";
import path from "node:path";

export type RoadmapItem = { title: string; value: string };

// Reads the repo root's ROADMAP.md at build time (fs.readFileSync runs during
// `next build`, which has the full repo checked out — not a runtime fetch,
// so this works fine even though Vercel's deployed function only ships
// strata-css-docs-site/). Only the "### Heading" + "**Value:**" line are
// public-appropriate; the rest (Status, design questions) is contributor-facing.
export function getRoadmapItems(): RoadmapItem[] {
  const roadmapPath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "ROADMAP.md");
  let raw: string;
  try {
    raw = fs.readFileSync(roadmapPath, "utf8");
  } catch {
    return [];
  }

  const items: RoadmapItem[] = [];
  const headingMatches = [...raw.matchAll(/^### (.+)$/gm)];

  for (let i = 0; i < headingMatches.length; i++) {
    const start = headingMatches[i].index ?? 0;
    const end = headingMatches[i + 1]?.index ?? raw.length;
    const section = raw.slice(start, end);
    const title = headingMatches[i][1].trim().replace(/`/g, "");
    const valueMatch = section.match(/\*\*Value:\*\*\s*(.+)/);
    if (valueMatch) {
      items.push({ title, value: valueMatch[1].trim().replace(/`/g, "") });
    }
  }

  return items;
}
