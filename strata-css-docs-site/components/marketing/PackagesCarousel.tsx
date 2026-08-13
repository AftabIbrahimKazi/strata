"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";
import PackageIcon from "./PackageIcon";
import type { PackageInfo } from "@/lib/packages";

export default function PackagesCarousel({ packages }: { packages: PackageInfo[] }) {
  return (
    <Swiper
      modules={[EffectCoverflow, Navigation, Pagination]}
      effect="coverflow"
      grabCursor
      centeredSlides
      slidesPerView="auto"
      coverflowEffect={{ rotate: 30, stretch: 0, depth: 120, modifier: 1, slideShadows: false }}
      navigation
      pagination={{ clickable: true }}
      className="packages-carousel"
    >
      {packages.map((pkg) => (
        <SwiperSlide key={pkg.slug} className="packages-carousel-slide">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <div className="mb-3 text-primary">
                <PackageIcon slug={pkg.slug} />
              </div>
              <h3 className="card-title">{pkg.title}</h3>
              <p className="card-text text-muted mb-3">{pkg.description}</p>

              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge-primary">v{pkg.version}</span>
                {pkg.techStack.map((t) => (
                  <span key={t} className="badge-light">
                    {t}
                  </span>
                ))}
              </div>

              <div className="d-flex align-items-center gap-2 mt-auto">
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
                <Link href={`/packages/${pkg.slug}`} className="btn-primary btn-sm flex-fill text-center">
                  Docs
                </Link>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
