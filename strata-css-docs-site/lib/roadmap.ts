import fs from "node:fs";
import path from "node:path";

export type RoadmapItem = { title: string; value: string };

// Reads the repo root's ROADMAP.md, falling back to a checked-in backup copy
// inside this project when ISR re-renders the page at request time on Vercel,
// where only strata-css-docs-site/ is shipped. Only the "### Heading" +
// "**Value:**" line are public-appropriate; the rest (Status, design
// questions) is contributor-facing.
export function getRoadmapItems(): RoadmapItem[] {
  const roadmapPath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "ROADMAP.md");
  // Falls back to a checked-in copy inside the deployed project when the repo-root
  // file isn't present — e.g. Vercel's serverless function only ships this
  // directory, so a request-time re-render (ISR) can't reach ../ROADMAP.md.
  const backupPath = path.join(/* turbopackIgnore: true */ process.cwd(), "content", "ROADMAP.backup.md");
  let raw: string;
  try {
    raw = fs.readFileSync(roadmapPath, "utf8");
  } catch {
    try {
      raw = fs.readFileSync(backupPath, "utf8");
    } catch {
      return [];
    }
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
