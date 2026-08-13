import Logo from "@/components/Logo";
import packages from "@/content/packages.json";
import { getTotalDownloads, getLatestVersionInfo } from "@/lib/npm";

export default async function PackagesGrid() {
  const enriched = await Promise.all(
    packages.map(async (pkg) => {
      const [downloads, versionInfo] = await Promise.all([
        getTotalDownloads(pkg.npmName),
        getLatestVersionInfo(pkg.npmName),
      ]);
      return { ...pkg, downloads, version: versionInfo?.version ?? null };
    })
  );

  return (
    <section id="packages" className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 gap-2">
        <div>
          <h2 className="mb-1">Companion Packages</h2>
          <p className="text-muted mb-0">Essential tools that work seamlessly with Strata.</p>
        </div>
        <p className="text-muted mb-0">
          All packages work <span className="text-primary">standalone</span> outside of Strata.
        </p>
      </div>

      <div className="row g-3">
        {enriched.map((pkg) => (
          <div key={pkg.slug} className="col-12 col-sm-6 col-lg-3">
            <a
              href={`https://www.npmjs.com/package/${pkg.npmName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card h-100 text-decoration-none"
            >
              <div className="card-body">
                <div className="mb-2">
                  <Logo size={22} />
                </div>
                <h3 className="card-title">{pkg.title}</h3>
                <p className="card-text text-muted mb-3">{pkg.description}</p>
                <div className="d-flex align-items-center gap-3 text-muted">
                  <span>↓ {pkg.downloads.toLocaleString()} downloads</span>
                  {pkg.version && <span>v{pkg.version}</span>}
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
