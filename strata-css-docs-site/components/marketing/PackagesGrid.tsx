import { getPackages } from "@/lib/packages";
import PackagesCarousel from "./PackagesCarousel";

export default function PackagesGrid() {
  const packages = getPackages();

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

      <PackagesCarousel packages={packages} />
    </section>
  );
}
