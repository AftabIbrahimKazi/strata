import fs from "node:fs";
import path from "node:path";

export type WhatsNewItem = { version: string; date: string; title: string; description: string };

const BRIEF_LENGTH = 160;

// Reads the repo root's CHANGELOG.md at build time (same static-file pattern
// as lib/roadmap.ts) and surfaces the 3 most recent "### Added" bullets —
// i.e. actual new features, not Fixed/Security/Docs/Tests entries — across
// versions, newest first. Adding a new "### Added" bullet to the top of
// CHANGELOG.md is the only thing needed to update this section; no code
// change required.
export function getLatestFeatures(count = 3): WhatsNewItem[] {
  const changelogPath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "CHANGELOG.md");
  // Falls back to a checked-in copy inside the deployed project when the repo-root
  // file isn't present — e.g. Vercel's serverless function only ships this
  // directory, so a request-time re-render (ISR) can't reach ../CHANGELOG.md.
  const backupPath = path.join(/* turbopackIgnore: true */ process.cwd(), "content", "CHANGELOG.backup.md");
  let raw: string;
  try {
    raw = fs.readFileSync(changelogPath, "utf8");
  } catch {
    try {
      raw = fs.readFileSync(backupPath, "utf8");
    } catch {
      return [];
    }
  }

  const versionMatches = [...raw.matchAll(/^## \[(.+?)\] — (.+)$/gm)];
  const items: WhatsNewItem[] = [];

  for (let i = 0; i < versionMatches.length && items.length < count; i++) {
    const version = versionMatches[i][1];
    const date = versionMatches[i][2];
    const start = versionMatches[i].index ?? 0;
    const end = versionMatches[i + 1]?.index ?? raw.length;
    const block = raw.slice(start, end);

    const addedMatch = block.match(/^### Added.*$([\s\S]*?)(?=^### |\n---|$(?![\s\S]))/m);
    if (!addedMatch) continue;

    const bullets = addedMatch[1].split(/\n(?=- )/).map((b) => b.trim()).filter(Boolean);

    for (const bullet of bullets) {
      if (items.length >= count) break;
      const firstLine = bullet.replace(/^- /, "").split("\n")[0].trim();

      let title: string;
      let description: string;

      const boldMatch = firstLine.match(/\*\*(.+?)\*\*/);
      const dashSplit = firstLine.match(/^(.+?)\s+—\s+(.+)$/);

      if (boldMatch) {
        // "**Bold lead-in**, rest of the sentence." — the common case.
        title = boldMatch[1].replace(/`/g, "");
        description = firstLine
          .replace(/\*\*(.+?)\*\*/, "")
          .replace(/`/g, "")
          .replace(/^[.,\s-]+/, "")
          .trim();
      } else if (dashSplit) {
        // "`path/or/label` — description." — no bold marker, split on the em dash instead
        // of falling back to a raw character slice (which used to cut mid-word and leave
        // backticks in the title, then repeat the whole sentence again as the description).
        title = dashSplit[1].replace(/`/g, "").trim();
        description = dashSplit[2].replace(/`/g, "").trim();
      } else {
        // No structural marker at all — truncate at a word boundary rather than mid-word.
        const clean = firstLine.replace(/`/g, "");
        title = clean.length > 60 ? clean.slice(0, 60).replace(/\s+\S*$/, "") + "…" : clean;
        description = clean;
      }

      if (description.length > BRIEF_LENGTH) {
        description = description.slice(0, BRIEF_LENGTH).replace(/\s+\S*$/, "") + "…";
      }
      items.push({ version, date, title, description });
    }
  }

  return items;
}
