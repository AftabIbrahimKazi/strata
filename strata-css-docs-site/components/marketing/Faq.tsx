"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is Strata CSS?",
    a: "A JIT CSS framework that combines Bootstrap's component-first classes (btn-primary, card, navbar) with Tailwind's JIT scanning — it scans your source files for class names and generates only the CSS those classes actually need, nothing more.",
  },
  {
    q: "Do I need a purge step, like older utility frameworks?",
    a: "No. Strata is JIT from the start — there's no separate purge/optimize pass. It scans your content globs at build time and only ever emits CSS for classes it actually finds (or ones you've explicitly safelisted).",
  },
  {
    q: "What kinds of files does it scan?",
    a: "Any file your content globs match — .html, .jsx, .tsx, .vue, .astro, .svelte, and beyond. Strata doesn't hardcode extensions; if a glob matches a file, it scans it, whatever the extension.",
  },
  {
    q: "Can I use arbitrary values, like Tailwind's square-bracket syntax?",
    a: "Yes — w-[320px], bg-[#f0f4f8], text-[1.125rem], shadow-[0_4px_20px_rgba(0,0,0,0.1)], and more. Anything not in the named registry can be expressed with square brackets.",
  },
  {
    q: "How does theming work?",
    a: "Themes are set via a data-st-theme attribute (light, dark, or dim) on any ancestor element, usually <html>. Without it, Strata respects the visitor's prefers-color-scheme automatically.",
  },
  {
    q: "Do I need a JavaScript framework for interactive components like modals?",
    a: "No — interactive states (visible, collapsed, active, loading, disabled) are driven by data-st-* attributes directly in CSS. Component JavaScript (for things like modal/offcanvas open-close logic) ships as separate, optional @strata-packages/* packages you install only if you need them.",
  },
  {
    q: "Is Strata free and open source?",
    a: "Yes — MIT licensed. The core strata-css package and every @strata-packages/* companion package are all published on npm under the same license.",
  },
  {
    q: "Does Strata support responsive breakpoints and variants?",
    a: "Yes — utilities and components have breakpoint variants across sm, md, lg, xl, and xxl (e.g. px-md-4, d-lg-flex, text-md-center), and higher breakpoint layers always win over lower ones regardless of class order in your HTML.",
  },
];

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
