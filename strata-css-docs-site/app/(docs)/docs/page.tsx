import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Strata CSS documentation — a JIT CSS framework combining component-first classes with utility-first, JIT-scanned styling.",
  alternates: { canonical: "/docs" },
};

const FEATURES = [
  {
    title: "Layered by Design",
    body: "Built on the concept of layers, working with the CSS cascade instead of fighting it.",
  },
  {
    title: "JIT Engine",
    body: "A blazing-fast JIT engine that generates only the CSS you actually use.",
  },
  {
    title: "Component First",
    body: "Pre-built components you can customize and extend, or drop in as-is.",
  },
  {
    title: "Framework Agnostic",
    body: "Works with any framework — or even vanilla HTML, no build-tool lock-in.",
  },
];

const NEXT_STEPS = [
  {
    href: "/guides/installation",
    title: "Installation",
    body: "Install from npm and wire up the entry CSS file and build.",
  },
  {
    href: "/guides/configuration",
    title: "Configuration",
    body: "Point Strata at your content globs and safelist dynamic classes.",
  },
  {
    href: "/guides/theme-system",
    title: "Theme System",
    body: "Light, dark and dim themes driven by a single data attribute.",
  },
  {
    href: "/guides/data-attribute-states",
    title: "Data-Attribute States",
    body: "Drive interactive state — modals, collapses, loading — without a JS framework.",
  },
];

export default function DocsHome() {
  return (
    <div className="prose-links">
      <span className="docs-eyebrow mb-3">Introduction</span>
      <h1 className="fw-bold mb-3">Welcome to Strata CSS</h1>
      <p className="text-muted mb-4">
        A JIT CSS framework that combines the power of component-driven design with the
        flexibility of utility-first classes — all working with the natural cascade.
      </p>
      <div className="d-flex gap-2 mb-5">
        <Link href="/guides/installation" className="btn-primary">
          Get Started
        </Link>
        <a
          href="https://github.com/AftabIbrahimKazi/strata"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-secondary d-flex align-items-center gap-2"
        >
          View on GitHub
        </a>
      </div>

      <div className="row g-3 mb-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="col-12 col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="mb-2">
                  <Logo size={22} />
                </div>
                <h3 className="card-title">{f.title}</h3>
                <p className="card-text text-muted mb-0">{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3">Why layers?</h2>
      <p className="mb-3">
        Utility classes are convenient but notoriously hard to override predictably — the last
        rule in source order usually wins, not the one you actually meant. Strata sidesteps
        that by generating everything into native CSS cascade layers: base tokens, then
        components, then utilities, each split further by breakpoint. A utility always beats a
        component at the same breakpoint, and a higher breakpoint always beats a lower one —
        regardless of the order classes appear in your HTML. You stop fighting specificity and
        start relying on it.
      </p>
      <p className="mb-5">
        Combined with JIT scanning — Strata only emits CSS for classes it actually finds in
        your source, no purge step, no unused utility bloat — you get the ergonomics of a
        utility-first workflow with the predictability of a component library.
      </p>

      <h2 className="mb-3">Quick start</h2>
      <p className="mb-3">Install it:</p>
      <CodeBlock code={`npm install strata-css`} lang="bash" />

      <p className="mt-4 mb-3">
        Then run the interactive installer — it detects your framework (Next.js, Astro, Nuxt,
        SvelteKit, Laravel, Vite) and writes the entry CSS file, config, and build scripts for
        you:
      </p>
      <CodeBlock code={`npx strata-css init`} lang="bash" />

      <p className="mt-4 mb-3">
        Or wire it up by hand — add the three directives to an entry CSS file yourself. Strata
        replaces these with generated CSS at build time:
      </p>
      <CodeBlock lang="css" code={`@strata base;\n@strata components;\n@strata utilities;`} />

      <p className="mt-4 mb-3">Use classes directly in your markup, no build step required to see them in your editor:</p>
      <CodeBlock
        lang="html"
        code={`<button class="btn-primary px-4 py-2 rounded-pill shadow-sm">\n  Get Started\n</button>`}
      />

      <p className="mt-4 mb-5">
        Then build — Strata scans your files and generates only the CSS those classes need:
      </p>
      <CodeBlock code={`npx strata-css --build`} lang="bash" />
      <p className="mt-3 mb-5">
        The full <a href="/guides/installation">Installation guide</a> covers what{" "}
        <code>init</code> does under the hood, broken down by framework.
      </p>

      <h2 className="mb-3">Where to go next</h2>
      <div className="row g-3">
        {NEXT_STEPS.map((step) => (
          <div key={step.href} className="col-12 col-md-6">
            <Link href={step.href} className="card h-100 text-decoration-none">
              <div className="card-body">
                <h3 className="card-title">{step.title}</h3>
                <p className="card-text text-muted mb-0">{step.body}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
