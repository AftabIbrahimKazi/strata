import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = {
  title: "Installation Guide",
  description: "Install Strata CSS from npm and wire up the entry CSS file and PostCSS build.",
  alternates: { canonical: "/guides/installation" },
};

export default function InstallationPage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Installation</h1>
      <p className="mb-4">Install Strata CSS from npm:</p>
      <CodeBlock code={`npm install strata-css`} lang="bash" />

      <h2 className="mt-5 mb-3">Add the entry CSS file</h2>
      <p className="mb-3">
        Create a <code>strata.css</code> file with the three Strata directives — Strata
        replaces these with generated CSS at build time:
      </p>
      <CodeBlock
        lang="css"
        code={`@strata base;\n@strata components;\n@strata utilities;`}
      />

      <h2 className="mt-5 mb-3">Build</h2>
      <p className="mb-3">Run the CLI to scan your source and generate output CSS:</p>
      <CodeBlock code={`npx strata-css --build`} lang="bash" />
      <p className="mb-3">Or watch mode during development:</p>
      <CodeBlock code={`npx strata-css --watch`} lang="bash" />

      <p className="mt-4">
        Next, set up your <a href="/guides/configuration">configuration</a> so Strata knows
        where to scan for class names.
      </p>
    </div>
  );
}
