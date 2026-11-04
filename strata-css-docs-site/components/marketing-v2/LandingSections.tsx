import type { ReactNode } from "react";

/**
 * The landing page below the Hero3D fold, matching the reference layout:
 * a light "surface" intro, a dark layered cutaway, six numbered layer
 * sections (one per real Strata architecture concept), a descent/engine
 * view, a core section, and a closing CTA. Footer is rendered by the
 * marketing layout, not here.
 *
 * Every class here is checked against the actual registry, not assumed —
 * Strata has no text-sm/rounded-lg/h3 Tailwind-style tokens; font sizes and
 * border shorthands go through the fs-[...] and border-[width_style_color]
 * arbitrary families instead. The five bg-[#hex] classes on the per-layer
 * sections are built from a data array (see LAYER_SECTIONS), so the scanner
 * can't see them as literals — they're safelisted in strata.config.js,
 * same pattern already used for Swatch's bg-[${hex}].
 */

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-primary fw-bold fs-[0.8rem] mb-2 text-uppercase">{children}</p>;
}

/* ---------------------------------------------------------------- 01 — Surface intro (light) */

const SURFACE_CARDS = [
  { title: "0 !important", desc: "We let the cascade do the work." },
  { title: "JIT", desc: "On-demand generation for every build." },
  { title: "CSS-native", desc: "Built on the cascade. Not against it." },
  { title: "Any stack", desc: "Framework agnostic. Works with React, Vue, Astro, Laravel or anything." },
];

const SAMPLE_CHIPS = ["mt-6", "p-4", "bg-orange-500", "rounded-3", "fs-[0.85rem]"];

export function SurfaceIntro() {
  return (
    <section className="bg-body py-5 py-md-[6rem] overflow-hidden">
      <div className="container">
        <Eyebrow>01 / Surface</Eyebrow>
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-6">
            <h2 className="fw-bold lh-sm mb-0 fs-[2rem] fs-md-[2.5rem]">
              Start at the surface. Descend only when you need the control.
            </h2>
          </div>
          <div className="col-12 col-lg-6">
            <p className="text-muted mb-0">
              Strata blends the familiarity of component syntax with the power of utilities and the
              elegance of the CSS cascade. No !important. No fights. Just layers.
            </p>
          </div>
        </div>

        <div className="row g-3 mt-4">
          {SURFACE_CARDS.map((card) => (
            <div key={card.title} className="col-12 col-sm-6 col-lg-3">
              <div className="h-100 p-4 rounded-3 border bg-[var(--st-bg-secondary)]">
                <p className="fw-bold text-primary mb-2">{card.title}</p>
                <p className="text-muted fs-[0.9rem] mb-0">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-center mt-5">
          {SAMPLE_CHIPS.map((chip) => (
            <span
              key={chip}
              className="px-3 py-1 rounded-pill border text-muted fs-[0.85rem] font-monospace bg-[var(--st-bg-secondary)]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Cutaway diagram (dark) */

const CUTAWAY_LAYERS = [
  { n: "01", label: "SURFACE", line: "Components & Patterns" },
  { n: "02", label: "COMPONENTS", line: "Familiar. Expressive." },
  { n: "03", label: "UTILITIES", line: "Utility classes without the specificity wars" },
  { n: "04", label: "CASCADE", line: "The cascade is the engine." },
  { n: "05", label: "JIT ENGINE", line: "On-demand. Zero waste." },
  { n: "06", label: "CORE", line: "Minimal. Fast. Unopinionated." },
];

const TELEMETRY: [string, string][] = [
  ["Layers", "06"],
  ["Utilities", "1000+"],
  ["Bundle size", "-5.2KB"],
  ["Build time", "~120ms"],
  ["Specificity", "Balanced"],
  ["!important", "0"],
];

export function CutawayDiagram() {
  return (
    <section className="bg-[#0c0a08] text-white py-5 py-md-[5rem]">
      <div className="container">
        <div className="row g-5 align-items-center">
          <div className="col-12 col-lg-5">
            <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
              {CUTAWAY_LAYERS.map((l) => (
                <li key={l.n} className="d-flex align-items-baseline gap-3">
                  <span className="text-primary fw-bold font-monospace">{l.n}</span>
                  <div>
                    <p className="fw-bold mb-0 fs-[0.85rem] text-uppercase">{l.label}</p>
                    <p className="text-[rgba(255,255,255,0.55)] fs-[0.85rem] mb-0">{l.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-12 col-lg-4">
            <div className="rounded-3 overflow-hidden border-[1px_solid_rgba(255,255,255,0.08)]">
              {CUTAWAY_LAYERS.map((l) => (
                <div key={l.n} className="px-3 py-3 d-flex align-items-center justify-content-between">
                  <span className="fs-[0.85rem] font-monospace text-[rgba(255,255,255,0.7)]">{l.n}</span>
                  <span className="fs-[0.85rem] fw-bold">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12 col-lg-3">
            <div className="rounded-3 border-[1px_solid_rgba(255,255,255,0.1)] p-4 bg-[rgba(255,255,255,0.03)]">
              <p className="fs-[0.8rem] fw-bold text-uppercase text-[rgba(255,255,255,0.5)] mb-3">
                Strata telemetry
              </p>
              <dl className="mb-0">
                {TELEMETRY.map(([label, value]) => (
                  <div key={label} className="d-flex justify-content-between py-1 fs-[0.85rem]">
                    <dt className="text-[rgba(255,255,255,0.55)] fw-normal">{label}</dt>
                    <dd className="mb-0 fw-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Six numbered layer sections (dark) */

interface LayerSectionData {
  n: string;
  key: string;
  depth: string;
  title: string;
  desc: string;
  chips?: string[];
  code: string;
  codeLang: string;
  stats: [string, string][];
  /** Full literal class name — see the file header note on why this is
   * safelisted rather than resolved implicitly. */
  bgClass: string;
}

const LAYER_SECTIONS: LayerSectionData[] = [
  {
    n: "01",
    key: "SURFACE",
    depth: "0.2 km",
    title: "Surface — familiar component syntax.",
    desc: "Express common UI with semantic, composable component classes.",
    chips: [".btn .btn-primary", ".btn .btn-ghost"],
    code: `<button class="btn btn-primary">Get Started</button>

<div class="card p-4 rounded-xl">
  <h3 class="fw-semibold">Card title</h3>
  <p class="text-muted">
    A reusable card built with component classes.
  </p>
</div>`,
    codeLang: "html",
    stats: [
      ["Components", "48+"],
      ["Patterns", "120+"],
    ],
    bgClass: "bg-[#241b16]",
  },
  {
    n: "02",
    key: "COMPONENTS",
    depth: "0.8 km",
    title: "Layer 02 — utility classes without the fight.",
    desc: "Low specificity. Predictable. No !important. Ever.",
    chips: ["p-4", "m-2", "d-flex", "align-items-center", "gap-3", "bg-orange-500", "rounded-lg"],
    code: `<div class="p-4 m-2 bg-orange-500
  rounded-lg d-flex align-items-center gap-3">
  <span class="fw-medium text-white">
    Utility first.
  </span>
</div>`,
    codeLang: "html",
    stats: [
      ["Utilities", "1000+"],
      ["Conflicts", "0"],
    ],
    bgClass: "bg-[#201814]",
  },
  {
    n: "03",
    key: "UTILITIES",
    depth: "1.4 km",
    title: "Layer 03 — arbitrary values where you need them.",
    desc: "When design gets specific, you stay in control.",
    chips: [
      "gtc-[1.2fr_2fr]",
      "h-[calc(100vh-64px)]",
      "px-[clamp(1rem,2vw,2rem)]",
      "bg-[radial-gradient(circle,_#111,_#000)]",
    ],
    code: `<div class="gtc-[1.2fr_2fr]
  h-[calc(100vh-64px)]
  px-[clamp(1rem,2vw,2rem)]
  bg-[radial-gradient(circle,_#111,_#000)]">
</div>`,
    codeLang: "html",
    stats: [
      ["Arbitrary", "Unlimited"],
      ["Power", "Uncapped"],
    ],
    bgClass: "bg-[#1c1512]",
  },
  {
    n: "04",
    key: "CASCADE",
    depth: "2.1 km",
    title: "Layer 04 — the cascade is the engine.",
    desc: "Native CSS cascade. Layered. Intentional. Performant.",
    chips: ["Component Layer", "Utility Layer", "Arbitrary Layer", "User Layer"],
    code: `@layer components, utilities, arbitrary, user;

@layer components { ... }
@layer utilities  { ... }
@layer arbitrary  { ... }
@layer user       { ... }`,
    codeLang: "css",
    stats: [
      ["Specificity", "Balanced"],
      ["!important", "0"],
    ],
    bgClass: "bg-[#17110e]",
  },
  {
    n: "05",
    key: "JIT ENGINE",
    depth: "3.0 km",
    title: "Layer 05 — JIT generation at lightspeed.",
    desc: "Only what you use. Generated when it's needed. Always fast.",
    chips: ["Files Scanned: 312", "Classes Generated: 842", "Build Time: ~120ms", "Cache Hit Rate: 98.7%"],
    code: `strata-css v1.9.0
Scanning content...
Generated 842 classes.
Build time: 120ms.
Watching for changes...
Ready.`,
    codeLang: "terminal",
    stats: [
      ["Speed", "120ms"],
      ["Waste", "0"],
    ],
    bgClass: "bg-[#120d0a]",
  },
];

function CodePanel({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-3 border-[1px_solid_rgba(255,255,255,0.1)] overflow-hidden">
      <div className="px-3 py-2 border-bottom-[1px_solid_rgba(255,255,255,0.1)] fs-[0.8rem] text-[rgba(255,255,255,0.5)] font-monospace">
        {title}
      </div>
      <pre className="p-3 m-0 overflow-x-auto bg-[rgba(0,0,0,0.25)]">
        <code className="fs-[0.85rem] font-monospace text-[rgba(255,255,255,0.85)] lh-base">{code}</code>
      </pre>
    </div>
  );
}

export function LayerSections() {
  return (
    <>
      {LAYER_SECTIONS.map((section) => (
        <section key={section.n} className={`text-white py-5 py-md-[4rem] ${section.bgClass}`}>
          <div className="container">
            <div className="row g-4">
              <div className="col-12 col-lg-3">
                <p className="text-[rgba(255,255,255,0.4)] fs-[0.8rem] font-monospace mb-1">
                  DEPTH {section.depth}
                </p>
                <p className="text-primary fw-bold fs-[0.85rem] mb-1">
                  {section.n} / {section.key}
                </p>
                <h3 className="fw-bold fs-[1.5rem] mb-2">{section.title}</h3>
                <p className="text-[rgba(255,255,255,0.6)] fs-[0.9rem] mb-0">{section.desc}</p>
              </div>

              <div className="col-12 col-lg-6">
                {section.chips && (
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {section.chips.map((chip) => (
                      <span
                        key={chip}
                        className="px-2 py-1 rounded border-[1px_solid_rgba(255,255,255,0.15)] fs-[0.8rem] font-monospace text-[rgba(255,255,255,0.75)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                <CodePanel title={`LAYER ${section.n} — ${section.codeLang.toUpperCase()}`} code={section.code} />
              </div>

              <div className="col-12 col-lg-3">
                <div className="rounded-3 border-[1px_solid_rgba(255,255,255,0.1)] p-3 h-100">
                  <p className="fs-[0.8rem] fw-bold text-uppercase text-[rgba(255,255,255,0.5)] mb-2">
                    Layer {section.n} stats
                  </p>
                  {section.stats.map(([label, value]) => (
                    <div key={label} className="d-flex justify-content-between fs-[0.85rem] py-1">
                      <span className="text-[rgba(255,255,255,0.55)]">{label}</span>
                      <span className="fw-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- Descent view — engine translation (darkest) */

const INPUT_LINES = [
  ".btn { ... }",
  ".p-4",
  ".mt-6",
  ".bg-orange-500",
  ".rounded-xl",
  ".gtc-[1.2fr_2fr]",
  ".fs-[0.875rem]",
];

const OUTPUT_LINES = [
  ".btn { ... }",
  ".p-4 { padding: 1rem }",
  ".mt-6 { margin-top: 1.5rem }",
  ".bg-orange-500 { background: #f97316 }",
  ".rounded-xl { border-radius: 0.75rem }",
  ".gtc-[1.2fr_2fr] { grid-template-columns: 1.2fr 2fr }",
  ".fs-[0.875rem] { font-size: 0.875rem }",
];

export function DescentView() {
  return (
    <section className="bg-[#0a0705] text-white py-5 py-md-[5rem] position-relative overflow-hidden">
      <div
        className="position-absolute top-50 start-50 translate-middle rounded-circle bg-[radial-gradient(circle,_rgba(255,138,26,0.35)_0%,_rgba(255,138,26,0)_70%)] w-[600px] h-[600px] pe-none"
        aria-hidden="true"
      />
      <div className="container position-relative">
        <div className="text-center mb-5">
          <p className="text-[rgba(255,255,255,0.4)] fs-[0.8rem] font-monospace mb-1">DEPTH 3.6 km</p>
          <Eyebrow>Descent view</Eyebrow>
          <h2 className="fw-bold fs-[1.75rem] mb-2">Straight down to the engine.</h2>
          <p className="text-[rgba(255,255,255,0.6)] mb-0">
            Utility tokens fall. JIT turns intent into optimized CSS.
          </p>
        </div>

        <div className="row g-3 justify-content-center">
          <div className="col-12 col-md-6">
            <CodePanel title="INPUT — classes you wrote" code={INPUT_LINES.join("\n")} />
          </div>
          <div className="col-12 col-md-6">
            <CodePanel title="OUTPUT — CSS generated" code={OUTPUT_LINES.join("\n")} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 06 — Core (dark) */

const ARCHITECTURE_STEPS = ["Components", "Utilities", "Arbitrary", "Cascade", "JIT Engine"];

export function CoreSection() {
  return (
    <section className="bg-[#080604] text-white py-5 py-md-[5rem]">
      <div className="container">
        <div className="row g-5 align-items-center">
          <div className="col-12 col-lg-6">
            <p className="text-[rgba(255,255,255,0.4)] fs-[0.8rem] font-monospace mb-1">DEPTH 4.2 km</p>
            <Eyebrow>06 / Core</Eyebrow>
            <h2 className="fw-bold fs-[1.75rem] mb-2">Core — minimal, fast, unopinionated.</h2>
            <p className="text-[rgba(255,255,255,0.6)] mb-4">
              No magic. No conflicts. Just the platform and the cascade.
            </p>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
              {ARCHITECTURE_STEPS.map((step, i) => (
                <div key={step} className="d-flex align-items-center gap-2">
                  <span className="px-3 py-2 rounded border-[1px_solid_rgba(255,255,255,0.15)] fs-[0.85rem]">
                    {step}
                  </span>
                  {i < ARCHITECTURE_STEPS.length - 1 && (
                    <span className="text-[rgba(255,255,255,0.3)]" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="rounded-3 border-[1px_solid_rgba(255,255,255,0.1)] p-4">
              <p className="fs-[0.8rem] fw-bold text-uppercase text-[rgba(255,255,255,0.5)] mb-3">Install</p>
              <CodePanel title="terminal" code="$ npm i strata-css" />
              <div className="d-flex gap-2 mt-3">
                <a href="/docs" className="btn btn-primary">
                  Read the docs
                </a>
                <a href="https://github.com" className="btn btn-outline-light">
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Closing CTA (light) */

export function ClosingCTA() {
  return (
    <section className="bg-body py-5 py-md-[5rem] position-relative">
      <div className="container">
        <div className="row align-items-center g-4">
          <div className="col-12 col-md-8">
            <p className="text-primary fw-bold fs-[0.8rem] mb-2 text-uppercase">Ascend / To surface</p>
            <h2 className="fw-bold fs-[1.75rem] mb-2">Ready to build from the surface down?</h2>
            <p className="text-muted mb-0">Start simple. Go deep when you need to.</p>
          </div>
          <div className="col-12 col-md-4 text-md-end">
            <a href="/docs" className="btn btn-primary btn-lg">
              Get Started →
            </a>
          </div>
        </div>
        <p className="text-muted fs-[0.85rem] mt-4 mb-0 font-monospace">18.5204° N, 73.8567° E</p>
      </div>
    </section>
  );
}
