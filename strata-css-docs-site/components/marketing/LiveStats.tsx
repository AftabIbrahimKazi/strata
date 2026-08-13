import fs from "node:fs";
import path from "node:path";
import { getLatestVersionInfo } from "@/lib/npm";

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body">
          <p className="text-muted mb-2">{label}</p>
          <p className="fw-bold text-primary mb-1">{value}</p>
          {sub && <p className="text-muted mb-0">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// Runtime dependency count of strata-css itself, read from the repo root at
// build time (see lib/roadmap.ts for why this is safe on Vercel).
function getDependencyCount(): number {
  const pkgPath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return Object.keys(pkg.dependencies || {}).length;
  } catch {
    return 0;
  }
}

export default async function LiveStats() {
  const versionInfo = await getLatestVersionInfo("strata-css");
  const dependencyCount = getDependencyCount();

  return (
    <section className="container py-4">
      <h2 className="mb-3">Live Stats</h2>
      <div className="row g-3">
        <StatTile
          label="Versions Shipped"
          value={versionInfo ? versionInfo.versionCount.toLocaleString() : "—"}
          sub="Continuously improved"
        />
        <StatTile
          label="Latest Version"
          value={versionInfo ? `v${versionInfo.version}` : "—"}
          sub={versionInfo ? `Released ${versionInfo.daysAgo} day${versionInfo.daysAgo === 1 ? "" : "s"} ago` : undefined}
        />
        <StatTile label="Runtime Dependencies" value={String(dependencyCount)} sub="Lean footprint" />
        <div className="col-6 col-lg-3">
          <a
            href="https://socket.dev/npm/package/strata-css"
            target="_blank"
            rel="noopener noreferrer"
            className="card h-100 text-decoration-none"
          >
            <div className="card-body">
              <p className="text-muted mb-2">Security</p>
              <p className="fw-bold text-primary mb-1">View Report</p>
              <p className="text-muted mb-0">Socket security dashboard →</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
