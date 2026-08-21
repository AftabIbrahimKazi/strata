"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { WhatsNewItem } from "@/lib/whatsNew";

export default function WhatsNew({ items }: { items: WhatsNewItem[] }) {
  if (!items.length) return null;

  return (
    <section className="container py-4">
      <h2 className="mb-1">What&apos;s New</h2>
      <p className="text-muted mb-3">The latest features shipped in Strata, in brief.</p>

      <Swiper
        modules={[Autoplay, Pagination]}
        loop
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="whats-new-swiper"
      >
        {items.map((item) => (
          <SwiperSlide key={`${item.version}-${item.title}`}>
            <div className="border rounded p-4 whats-new-slide">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="gh-badge">
                  <span className="gh-badge-label">v{item.version}</span>
                </span>
                <span className="text-muted">{item.date}</span>
              </div>
              <h3 className="card-title mb-2">{item.title.replace(/\.$/, "")}</h3>
              <p className="text-muted mb-0">{item.description}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
