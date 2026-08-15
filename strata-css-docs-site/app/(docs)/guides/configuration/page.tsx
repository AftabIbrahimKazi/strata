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
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Configuration</h1>
      <p className="mb-4">
        Add a <code>strata.config.js</code> (or <code>.cjs</code>) to your project root:
      </p>
      <CodeBlock
        lang="js"
        code={`module.exports = {\n  content: ['./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'],\n  input:   './strata.css',\n  output:  './dist/strata.output.css',\n  safelist: [],\n}`}
      />
      <Callout variant="tip" title="Already ran npx strata-css init?">
        The <a href="/guides/installation">installer</a> writes a starting{" "}
        <code>strata.config.js</code> for you — correct <code>input</code>/<code>output</code>{" "}
        paths for your framework, but always the same generic{" "}
        <code>./src/**/*.{"{html,jsx,tsx,vue,astro,svelte,js,ts}"}</code> content glob, regardless
        of your actual folder layout. Everything below is about checking and customizing what it
        generated, not an alternative to it.
      </Callout>

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
      <Callout variant="warning" title="The default glob assumes a src/ layout — many frameworks don't use one">
        Next.js's App Router puts routes in <code>app/</code>, not <code>src/app/</code>, unless
        you opted into a <code>src</code> directory — this documentation site&apos;s own config
        is <code>[&apos;./app/**/*.{"{js,jsx,ts,tsx}"}&apos;, &apos;./components/**/*.{"{js,jsx,ts,tsx}"}&apos;]</code>
        , not the generic default. If classes aren&apos;t showing up right after{" "}
        <code>init</code>, this glob not matching your real folders is the most common cause —
        check it before anything else.
      </Callout>

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
      <p className="mb-3">
        <code>init</code> does run an initial build for you, but silently — no scanned-file
        count, no warnings printed. If a class isn&apos;t showing up, run this yourself to see
        what the scanner actually saw:
      </p>
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
