import Link from "next/link";

/**
 * Shown instead of the WebGL scene when the visitor has WebGL unavailable
 * or `prefers-reduced-motion: reduce` set — no canvas is mounted and the
 * GLB models are never fetched in this path.
 */
export default function HeroFallback() {
  return (
    <div className="position-absolute inset-0 bg-[linear-gradient(180deg,#241708_0%,#0a0e14_70%)]" aria-hidden="true" />
  );
}

export function HeroCopy() {
  return (
    <div className="container position-relative z-1 text-center">
      {/* text-white goes on each heading/paragraph directly — Strata's own
          h1/p color rules target the elements themselves, which wins over
          an inherited color from this wrapper regardless of layer order. */}
      <h1 className="fw-bold mb-3 text-white">
        Strata CSS is built in <span className="text-primary">layers</span> — all the way down.
      </h1>
      <p className="mb-4 max-w-[560px] mx-auto text-white">
        Scroll to descend through the framework, from utility classes on the surface to the JIT
        engine at its core.
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
      </div>
    </div>
  );
}
