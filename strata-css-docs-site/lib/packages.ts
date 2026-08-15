import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execSync } from "node:child_process";

export type PackageInfo = {
  slug: string;
  npmName: string;
  title: string;
  description: string;
  version: string;
  license: string;
  techStack: string[];
  tags: string[];
  gzipSizeKb: number;
  lastUpdatedDaysAgo: number | null;
};

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Real gzip size of the files npm actually ships (package.json's "files"
// list) — not a claimed "minified" size, since these packages ship
// readable source, not a minified build.
function getGzipSizeKb(pkgDir: string, files: string[]): number {
  let total = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(pkgDir, file));
      total += zlib.gzipSync(raw).length;
    } catch {
      // Not every listed file is a measurable asset (e.g. README.md) — skip.
    }
  }
  return Math.round((total / 1024) * 10) / 10;
}

// Real last-commit date for the package's folder, via git — not a claimed
// "actively maintained" label.
function getLastUpdatedDaysAgo(repoRoot: string, slug: string): number | null {
  try {
    const iso = execSync(`git log -1 --format=%cI -- packages/${slug}`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    if (!iso) return null;
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  } catch {
    return null;
  }
}

// Reads every packages/<slug>/package.json from the repo root at build time
// (see lib/roadmap.ts for why this is safe on Vercel) — description,
// version, license, tech stack, tags (package.json "keywords"), shipped-
// file size, and last-updated date all come straight from the real repo,
// not a hand-maintained copy. A package gets picked up automatically the
// moment it exists in packages/, no site edit needed — same for adding/
// changing its keywords, which is all it takes to change the tags shown.
export function getPackages(): PackageInfo[] {
  const repoRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "..");
  const packagesRoot = path.join(repoRoot, "packages");
  let slugs: string[];
  try {
    slugs = fs
      .readdirSync(packagesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }

  return slugs
    .map((slug) => {
      const pkgDir = path.join(packagesRoot, slug);
      const pkgJsonPath = path.join(pkgDir, "package.json");
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter(
          (d) => d !== "strata-css"
        );
        const shippedFiles: string[] = Array.isArray(pkg.files) ? pkg.files : [];
        const keywords: string[] = Array.isArray(pkg.keywords) ? pkg.keywords : [];
        const tags = keywords.filter((k) => k !== "strata" && k !== "strata-css");
        return {
          slug,
          npmName: pkg.name as string,
          title: slugToTitle(slug),
          description: (pkg.description as string) || "",
          version: pkg.version as string,
          license: (pkg.license as string) || "MIT",
          techStack: deps.length ? deps : ["CSS", "Vanilla JS"],
          tags,
          gzipSizeKb: getGzipSizeKb(pkgDir, shippedFiles),
          lastUpdatedDaysAgo: getLastUpdatedDaysAgo(repoRoot, slug),
        };
      } catch {
        return null;
      }
    })
    .filter((p): p is PackageInfo => p !== null);
}

export function getPackage(slug: string): PackageInfo | null {
  return getPackages().find((p) => p.slug === slug) ?? null;
}
