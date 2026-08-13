import { getTotalDownloads, getLatestVersionInfo } from "@/lib/npm";

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
  const [totalDownloads, versionInfo] = await Promise.all([
    getTotalDownloads("strata-css"),
    getLatestVersionInfo("strata-css"),
  ]);

  return (
    <section className="container py-4">
      <h2 className="mb-3">Live Stats</h2>
      <div className="row g-3">
        <StatTile label="Total Downloads" value={totalDownloads.toLocaleString()} sub="npm, all-time" />
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
