import type { Metadata } from "next";
import Callout from "@/components/Callout";

export const metadata: Metadata = {
  title: "Build Pipeline Guide",
  description: "How Strata's JIT build pipeline scans, looks up, and generates only the CSS your project actually uses.",
  alternates: { canonical: "/guides/build-pipeline" },
};

export default function BuildPipelinePage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Build Pipeline</h1>
      <p className="mb-4">
        Strata is a JIT CSS framework — you write class names in your HTML/JSX, Strata scans
        those files, looks each class up in its registry, and emits only the CSS that&apos;s
        actually used. No purging step needed.
      </p>

      <Callout variant="tip" title="Nothing on this page is something you run yourself">
        This is what happens automatically, every time, inside every build — whether it&apos;s
        triggered by the CLI (<code>--build</code> / <code>--watch</code>), the PostCSS plugin
        running as part of Vite/Webpack&apos;s own pipeline, or the one-off build{" "}
        <code>strata-css init</code> runs for you during setup. There&apos;s no separate step
        here to remember; it&apos;s the same pipeline no matter which of those triggered it.
      </Callout>

      <h2 className="mt-4 mb-3">What happens on build</h2>
      <ol className="mb-4">
        <li className="mb-2">
          <code>strata.build()</code> calls <code>scanFiles(globs)</code> — finds all class names
          in your content files.
        </li>
        <li className="mb-2">
          Passes them to <code>generate(classNames)</code> — looks up each in the registry Map.
        </li>
        <li className="mb-2">
          Routes each rule to its breakpoint sub-layer (<code>st-utilities-md</code>,{" "}
          <code>st-components-lg</code>, etc.).
        </li>
        <li className="mb-2">
          String-replaces <code>@strata base/components/utilities</code> in the input CSS.
        </li>
        <li>Writes the output CSS to disk.</li>
      </ol>

      <h2 className="mt-4 mb-3">Warm builds</h2>
      <p className="mb-4">
        If nothing changed, Strata returns the cached CSS string — zero allocation.
      </p>

      <h2 className="mt-4 mb-3">CSS Layers</h2>
      <p className="mb-3">
        Layer declaration order controls cascade priority — source order in your HTML never
        matters:
      </p>
      <pre className="p-3 border rounded bg-[var(--st-bg-secondary)] overflow-x-auto">
{`st-base
st-components  ->  st-components-xs  <  sm  <  md  <  lg  <  xl  <  xxl
st-utilities   ->  st-utilities-xs   <  sm  <  md  <  lg  <  xl  <  xxl
st-skeleton`}
      </pre>
      <p className="mt-3">
        Higher breakpoint layers always beat lower ones, and utilities always win over
        components at the same breakpoint.
      </p>
    </div>
  );
}
