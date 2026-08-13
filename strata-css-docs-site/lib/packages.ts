import fs from "node:fs";
import path from "node:path";

export type PackageInfo = {
  slug: string;
  npmName: string;
  title: string;
  description: string;
  version: string;
  techStack: string[];
};

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Reads every packages/<slug>/package.json from the repo root at build time
// (see lib/roadmap.ts for why this is safe on Vercel) — description,
// version, and tech stack (dependencies) all come straight from the real
// package manifests, not a hand-maintained copy. A package gets picked up
// automatically the moment it exists in packages/, no site edit needed.
export function getPackages(): PackageInfo[] {
  const packagesRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "packages");
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
      const pkgJsonPath = path.join(packagesRoot, slug, "package.json");
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter(
          (d) => d !== "strata-css"
        );
        return {
          slug,
          npmName: pkg.name as string,
          title: slugToTitle(slug),
          description: (pkg.description as string) || "",
          version: pkg.version as string,
          techStack: deps.length ? deps : ["CSS", "Vanilla JS"],
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
