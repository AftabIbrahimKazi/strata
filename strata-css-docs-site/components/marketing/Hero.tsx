import Link from "next/link";
import InstallChip from "./InstallChip";
import { getLatestVersionInfo } from "@/lib/npm";

export default async function Hero() {
  const versionInfo = await getLatestVersionInfo("strata-css");

  return (
    <section className="text-center p-4 py-5">
      {versionInfo && (
        <Link href="/policies/changelog" className="whats-new-chip d-inline-flex align-items-center gap-2 mb-4 text-decoration-none">
          <span aria-hidden="true">✨</span>
          What&apos;s new in v{versionInfo.version}
          <span className="whats-new-chip-arrow" aria-hidden="true">→</span>
        </Link>
      )}
      {/* CursorFX Reveal. The container stacks its children in one grid cell
          and masks the LAST one, so the real <h1> goes last and the banded
          "cross-section" copy underneath is decorative and aria-hidden.
          Without the preset mounted (touch, reduced motion, no JS) the top
          layer simply stays opaque and the heading reads normally. */}
      <div className="hero-reveal mb-3" data-st-cfx-target="reveal">
        <p className="hero-strata fw-bold m-0" aria-hidden="true">
          Strata CSS — CSS that works in layers with the cascade.
        </p>
        <h1 className="fw-bold m-0">
          Strata CSS — CSS that works in <span className="text-primary">layers</span> with the{" "}
          <span className="text-primary">cascade</span>.
        </h1>
      </div>
      <p className="text-muted mb-4">
        Strata CSS is a JIT CSS framework that combines component-driven design with utility-first
        flexibility — it scans your files and generates only the CSS you actually use, no purge
        step required.
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
