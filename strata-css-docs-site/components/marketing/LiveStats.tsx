import { getWeeklyDownloads, getLatestVersionInfo } from "@/lib/npm";
import { getRepoStars } from "@/lib/github";

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

export default async function LiveStats() {
  const [downloads, stars, versionInfo] = await Promise.all([
    getWeeklyDownloads("strata-css"),
    getRepoStars("AftabIbrahimKazi", "strata"),
    getLatestVersionInfo("strata-css"),
  ]);

  return (
    <section className="container py-4">
      <h2 className="mb-3">Live Stats</h2>
      <div className="row g-3">
        <StatTile
          label="npm Weekly Downloads"
          value={downloads.count.toLocaleString()}
          sub={
            downloads.deltaPct !== null
              ? `${downloads.deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(downloads.deltaPct)}% vs last week`
              : undefined
          }
        />
        <StatTile label="GitHub Stars" value={stars !== null ? stars.toLocaleString() : "—"} />
        <StatTile
          label="Latest Version"
          value={versionInfo ? `v${versionInfo.version}` : "—"}
          sub={versionInfo ? `Released ${versionInfo.daysAgo} day${versionInfo.daysAgo === 1 ? "" : "s"} ago` : undefined}
        />
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
