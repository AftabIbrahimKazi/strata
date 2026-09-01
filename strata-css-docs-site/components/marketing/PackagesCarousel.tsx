"use client";

import { useState } from "react";
import WaveRule from "@/components/WaveRule";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper";
import { EffectCube, Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/navigation";
import "swiper/css/pagination";
import PackageImage from "./PackageImage";
import SocketBadge from "./SocketBadge";
import type { PackageInfo } from "@/lib/packages";

function StatIcon({ name }: { name: "size" | "deps" | "updated" | "license" }) {
  const paths: Record<string, string> = {
    size: "M21 8 12 3 3 8v8l9 5 9-5V8Zm-9-5v18M3 8l9 5 9-5",
    deps: "m9 18 6-6-6-6",
    updated: "M8 2v3M16 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
    license: "M12 3 5 6v6c0 4.5 3 7 7 9 4-2 7-4.5 7-9V6l-7-3Zm-2.5 9 1.8 1.8L15 10",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function InstallCommand({ npmName }: { npmName: string }) {
  const [copied, setCopied] = useState(false);
  const command = `npm i ${npmName}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (non-secure context, old browser) — no-op.
    }
  }

  return (
    <div className="install-cmd d-flex align-items-center justify-content-between gap-2 mb-3">
      <code className="install-cmd-text">{command}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy install command"
        className="icon-btn install-cmd-copy"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function PackagesCarousel({ packages }: { packages: PackageInfo[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pkg = packages[activeIndex];

  return (
    <div className="row g-4 align-items-center">
      <div className="col-12 col-md-5">
        <Swiper
          modules={[EffectCube, Navigation, Pagination, Autoplay]}
          effect="cube"
          grabCursor
          loop
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          cubeEffect={{ shadow: false, slideShadows: false }}
          navigation
          pagination={{ clickable: true }}
          onSlideChange={(swiper: SwiperClass) => setActiveIndex(swiper.realIndex)}
          className="packages-cube"
        >
          {packages.map((p) => (
            <SwiperSlide key={p.slug}>
              <PackageImage slug={p.slug} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="col-12 col-md-7">
        {pkg && (
          <div>
            <span className="border border-primary text-primary bg-transparent rounded-pill px-2 py-1 d-inline-block mb-2">
              COMPONENT
            </span>
            <h3 className="card-title mb-2">{pkg.title}</h3>
            <p className="text-muted mb-3 pkg-desc-clamp">{pkg.description}</p>

            <InstallCommand npmName={pkg.npmName} />

            <div className="d-flex flex-wrap align-items-center gap-2 pkg-badges-row">
              <span className="gh-badge">
                <span className="gh-badge-label">version</span>
                <span className="gh-badge-value">{pkg.version}</span>
              </span>
              <SocketBadge npmName={pkg.npmName} />
              {pkg.techStack.map((t) => (
                <span key={t} className="gh-tag">
                  {t}
                </span>
              ))}
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-3 pkg-tags-row">
              {pkg.tags.map((t) => (
                <span key={t} className="gh-tag">
                  {t}
                </span>
              ))}
            </div>

            {/* gx-only + row-gap: `g-2` also sets a vertical gutter, which pads the
                columns from the top but not the bottom, so the text sat closer to
                the lower line than the upper one. row-gap keeps the spacing when
                the columns wrap on small screens. */}
            <div className="row gx-2 row-gap-2 py-3 mb-0 position-relative text-muted">
              <WaveRule />
              <div className="col-6 col-sm-3 d-flex align-items-center gap-2">
                <StatIcon name="size" />
                <span>{pkg.gzipSizeKb} KB gzip</span>
              </div>
              <div className="col-6 col-sm-3 d-flex align-items-center gap-2">
                <StatIcon name="deps" />
                <span>{pkg.techStack.length} deps</span>
              </div>
              <div className="col-6 col-sm-3 d-flex align-items-center gap-2">
                <StatIcon name="updated" />
                <span>
                  {pkg.lastUpdatedDaysAgo === null
                    ? "—"
                    : pkg.lastUpdatedDaysAgo === 0
                      ? "Today"
                      : `${pkg.lastUpdatedDaysAgo}d ago`}
                </span>
              </div>
              <div className="col-6 col-sm-3 d-flex align-items-center gap-2">
                <StatIcon name="license" />
                <span>{pkg.license}</span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 pt-3 position-relative">
              <WaveRule />
              <a
                href={`https://github.com/AftabIbrahimKazi/strata/tree/main/packages/${pkg.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${pkg.title} on GitHub`}
                className="icon-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.65-4.04-1.65-.55-1.44-1.34-1.83-1.34-1.83-1.09-.77.08-.75.08-.75 1.21.09 1.84 1.28 1.84 1.28 1.07 1.87 2.81 1.33 3.5 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.24-3.34-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.28a11.2 11.2 0 0 1 6.01 0c2.29-1.61 3.3-1.28 3.3-1.28.66 1.71.24 2.97.12 3.28.77.87 1.24 1.98 1.24 3.34 0 4.78-2.81 5.84-5.48 6.14.43.38.81 1.13.81 2.29 0 1.65-.02 2.98-.02 3.39 0 .33.22.72.83.6C20.56 22.34 24 17.73 24 12.3 24 5.5 18.63 0 12 0Z" />
                </svg>
              </a>
              <a
                href={`https://www.npmjs.com/package/${pkg.npmName}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${pkg.title} on npm`}
                className="icon-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M0 0h24v24H0V0Zm12.99 5.005H3v14h6.995v-11h3v11H21v-14h-8.01Z" />
                </svg>
              </a>
              <Link href={`/packages/${pkg.slug}`} className="btn-primary btn-md text-center">
                View Docs →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
