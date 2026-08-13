import { notFound } from "next/navigation";
import { getPackages, getPackage } from "@/lib/packages";
import PackageIcon from "@/components/marketing/PackageIcon";

export function generateStaticParams() {
  return getPackages().map((p) => ({ slug: p.slug }));
}

export default async function PackageDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) notFound();

  return (
    <div className="container py-5 max-w-[720px]">
      <div className="mb-4 text-primary">
        <PackageIcon slug={pkg.slug} size={48} />
      </div>
      <h1 className="fw-bold mb-2">{pkg.title}</h1>
      <p className="text-muted mb-3">{pkg.description}</p>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <span className="badge-primary">v{pkg.version}</span>
        {pkg.techStack.map((t) => (
          <span key={t} className="badge-light">
            {t}
          </span>
        ))}
      </div>

      <div className="row g-3 border-top border-bottom py-3 mb-4 text-muted">
        <div className="col-6 col-sm-3">{pkg.gzipSizeKb} KB gzip</div>
        <div className="col-6 col-sm-3">{pkg.techStack.length} deps</div>
        <div className="col-6 col-sm-3">
          {pkg.lastUpdatedDaysAgo === null
            ? "Last updated —"
            : pkg.lastUpdatedDaysAgo === 0
              ? "Updated today"
              : `Updated ${pkg.lastUpdatedDaysAgo}d ago`}
        </div>
        <div className="col-6 col-sm-3">{pkg.license} License</div>
      </div>

      <h2 className="mb-3">Install</h2>
      <pre className="p-3 border rounded bg-[var(--st-bg-secondary)] overflow-x-auto mb-4">
        {`npm install ${pkg.npmName}`}
      </pre>

      <div className="d-flex flex-wrap gap-2">
        <a
          href={`https://github.com/AftabIbrahimKazi/strata/tree/main/packages/${pkg.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-secondary"
        >
          View on GitHub
        </a>
        <a
          href={`https://www.npmjs.com/package/${pkg.npmName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-secondary"
        >
          View on npm
        </a>
      </div>
    </div>
  );
}
