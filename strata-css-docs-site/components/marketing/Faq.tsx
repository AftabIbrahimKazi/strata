"use client";

import { useState } from "react";
import { FAQS } from "@/content/faq";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="container py-4">
      <h2 className="mb-1">Frequently Asked Questions</h2>
      <p className="text-muted mb-4">Straight answers, pulled from the actual docs.</p>

      <div className="accordion">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q} className="accordion-item">
              <h3 className="accordion-header">
                <button
                  type="button"
                  className={`accordion-button${isOpen ? "" : " collapsed"}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  {item.q}
                </button>
              </h3>
              <div className="accordion-collapse" data-st-collapsed={!isOpen}>
                <div className="accordion-body">
                  <p className="text-muted mb-0">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
