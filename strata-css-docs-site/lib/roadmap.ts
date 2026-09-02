import fs from "node:fs";
import path from "node:path";

export type RoadmapItem = {
  title: string;
  value: string;
  slug: string;
  badge: "Planned" | "Reserved";
  relatedHref?: string;
};

// Titles whose Status line reads "Closed" are investigations, not roadmap
// items, and must never surface publicly — the parser drops them outright
// rather than showing a reverted experiment as "Planned".
const CLOSED_STATUS = /^Closed\b/i;

// A handful of items map onto an existing docs page — kept as an explicit
// lookup (matched by slug) rather than parsed out of the markdown, since the
// source prose was never written with a machine-readable link in mind.
const RELATED_HREF: Record<string, string> = {
  "native-browser-popup-primitives-dialog-popover-api": "/packages/modal",
  "flipbook-richer-animation-and-native-rendering": "/packages/flipbook",
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Reads the repo root's ROADMAP.md, falling back to a checked-in backup copy
// inside this project when ISR re-renders the page at request time on Vercel,
// where only strata-css-docs-site/ is shipped. Only the "### Heading" +
// "**Value:**" line are public-appropriate; the rest (design questions, the
// paid-offering note on Premade themes) is contributor-facing and is never
// read by this parser.
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

    const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/);
    if (statusMatch && CLOSED_STATUS.test(statusMatch[1].trim())) continue;

    const valueMatch = section.match(/\*\*Value:\*\*\s*(.+)/);
    if (!valueMatch) continue;

    const slug = slugify(title);
    items.push({
      title,
      value: valueMatch[1].trim().replace(/`/g, ""),
      slug,
      badge: /^Reserved\b/i.test(statusMatch?.[1].trim() ?? "") ? "Reserved" : "Planned",
      relatedHref: RELATED_HREF[slug],
    });
  }

  return items;
}
