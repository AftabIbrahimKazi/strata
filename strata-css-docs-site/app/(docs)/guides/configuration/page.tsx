import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";

export const metadata: Metadata = {
  title: "Configuration Guide",
  description: "Configure Strata CSS's content globs, input/output paths, and safelist via strata.config.js.",
  alternates: { canonical: "/guides/configuration" },
};

export default function ConfigurationPage() {
  return (
    <div>
      <h1 className="fw-bold mb-3">Configuration</h1>
      <p className="mb-4">
        Add a <code>strata.config.js</code> (or <code>.cjs</code>) to your project root:
      </p>
      <CodeBlock
        lang="js"
        code={`module.exports = {\n  content: ['./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'],\n  input:   './strata.css',\n  output:  './dist/strata.output.css',\n  safelist: [],\n}`}
      />

      <h2 className="mt-5 mb-3">Content globs</h2>
      <p className="mb-3">
        Relative globs resolve against the project root — the directory containing{" "}
        <code>strata.config.js</code> — not whatever directory the build happens to run from.
      </p>
      <p className="mb-3">
        Any file the glob matches is scanned, whatever its extension — <code>.php</code>,{" "}
        <code>.blade.php</code>, <code>.mdx</code>, <code>.erb</code>, <code>.hbs</code>,{" "}
        <code>.twig</code>, and so on. Only binary/media formats are skipped.
      </p>

      <h2 className="mt-5 mb-3">Safelist</h2>
      <p className="mb-3">
        Class names to always emit, whether or not the scanner finds them — for classes built
        at runtime from a variable, returned by an API, or present in markup Strata never scans:
      </p>
      <CodeBlock
        lang="js"
        code={`safelist: [\n  'btn-primary',\n  'shadow-lg rounded-pill',   // an entry may hold several space-separated classes\n]`}
      />
      <Callout variant="tip" title="This site dogfoods its own safelist">
        The utility/component reference pages in this site toggle classes dynamically from JSON
        data inside an interactive playground — the scanner can&apos;t see those as literals, so
        they&apos;re safelisted directly from the same JSON that renders the reference tables.
      </Callout>

      <h2 className="mt-5 mb-3">Diagnosing a missing class</h2>
      <p className="mb-3">If a class isn&apos;t showing up, check what the scanner actually saw:</p>
      <CodeBlock
        lang="bash"
        code={`node bin/strata.js --build --verbose\n# [Strata]   scanned 35/35 matched file(s), 0 skipped, 788 class name(s) found\n# [Strata]   globs: ./src/**/*.{html,jsx,tsx}  (relative to /path/to/project)`}
      />
      <p>
        Two conditions are reported as warnings automatically: no files matched the content
        globs, or files matched but no class names were found in them. If neither warning
        appears and a class is still missing, it&apos;s almost certainly built dynamically
        (<code>{"`btn-${variant}`"}</code>) — no scanner can recover that. Safelist it.
      </p>
    </div>
  );
}
