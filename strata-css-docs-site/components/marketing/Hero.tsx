import Link from "next/link";
import InstallChip from "./InstallChip";
import { getLatestVersionInfo } from "@/lib/npm";

export default async function Hero() {
  const versionInfo = await getLatestVersionInfo("strata-css");

  return (
    <section className="text-center p-4 py-5">
      {versionInfo && (
        <Link
          href="/policies/changelog"
          className="badge-primary d-inline-block mb-4 text-decoration-none"
        >
          ✨ What&apos;s new in v{versionInfo.version}
        </Link>
      )}
      <h1 className="fw-bold mb-3">
        CSS that works in <span className="text-primary">layers</span> with the{" "}
        <span className="text-primary">cascade</span>.
      </h1>
      <p className="text-muted mb-4">
        Strata is a JIT CSS framework that combines the power of component-driven design with
        the flexibility of utility classes.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        <Link href="/docs" className="btn-primary">
          Get Started →
        </Link>
        <a
          href="https://github.com/AftabIbrahimKazi/strata"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-secondary"
        >
          View on GitHub
        </a>
        <InstallChip command="npm install strata-css" />
      </div>
    </section>
  );
}
