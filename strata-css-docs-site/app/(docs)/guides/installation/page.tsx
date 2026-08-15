import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";
import FrameworkTabs from "@/components/FrameworkTabs";

export const metadata: Metadata = {
  title: "Installation Guide",
  description:
    "Install Strata CSS from npm and wire up the build for Next.js, Vite (Vue/Nuxt/Astro/SvelteKit), Webpack, plain PostCSS, or plain HTML.",
  alternates: { canonical: "/guides/installation" },
};

const NEXTJS_TAB = (
  <div>
    <p className="mb-3">
      Next.js's built-in PostCSS pipeline is meant for Tailwind-style plugins that hook into its
      own config format, not arbitrary third-party plugins — a custom <code>postcssPlugin</code>{" "}
      like Strata's doesn't reliably run through it, with or without Turbopack. The reliable path
      is running the CLI as an npm lifecycle hook, then importing the generated file like any
      other stylesheet. This is exactly how this documentation site itself is built.
    </p>

    <h4 className="mt-4 mb-2">1. Add the build hooks</h4>
    <p className="mb-3">
      Run the CLI before both <code>next dev</code> and <code>next build</code>, so the generated
      CSS is always fresh before Next.js starts:
    </p>
    <CodeBlock
      lang="json"
      code={`{\n  "scripts": {\n    "predev": "strata-css --build",\n    "prebuild": "strata-css --build",\n    "dev": "next dev",\n    "build": "next build"\n  }\n}`}
    />

    <h4 className="mt-4 mb-2">2. Point strata.config.js at an output path inside your project</h4>
    <CodeBlock
      lang="js"
      code={`module.exports = {\n  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],\n  input:   './strata.css',\n  output:  './styles/strata.output.css',\n}`}
    />

    <h4 className="mt-4 mb-2">3. Import the generated file from your root layout</h4>
    <CodeBlock lang="tsx" code={`// app/layout.tsx\nimport "../styles/strata.output.css";`} />
    <p className="mb-3">
      That's a static file import, not a directive — Next.js bundles it like any other CSS
      import. The <code>@strata</code> directives only exist inside <code>strata.css</code>, the
      input file the CLI reads, never in the file you import here.
    </p>

    <h4 className="mt-4 mb-2">4. Verify it's working</h4>
    <p className="mb-3">
      Run the build with <code>--verbose</code> to confirm the scan actually found your classes:
    </p>
    <CodeBlock
      lang="bash"
      code={`npx strata-css --build --verbose\n# [Strata]   scanned 42/42 matched file(s), 0 skipped, 900 class name(s) found`}
    />

    <Callout variant="warning" title="Always use the npm script, never next build directly">
      Calling <code>next build</code> or <code>next start</code> without going through{" "}
      <code>npm run build</code> skips the <code>prebuild</code> hook — new classes you added
      will silently be missing from the compiled CSS, because the last-generated{" "}
      <code>strata.output.css</code> on disk is stale. If a class isn&apos;t showing up after you
      just added it, this is the first thing to check.
    </Callout>
    <Callout variant="tip" title="App Router or Pages Router — same wiring either way">
      Nothing here is Router-specific. On the Pages Router, import the generated file from{" "}
      <code>pages/_app.tsx</code> instead of <code>app/layout.tsx</code> — everything else is
      identical.
    </Callout>
  </div>
);

const VITE_TAB = (
  <div>
    <p className="mb-3">
      Vue, Nuxt, SvelteKit and Astro all sit on Vite under the hood, so the same PostCSS-plugin
      wiring works for every one of them — Strata runs as a live transform inside Vite&apos;s own
      dev server and build, with no separate CLI step and no watch process to keep running
      alongside it.
    </p>

    <h4 className="mt-4 mb-2">1. Create the entry CSS file and import it once</h4>
    <CodeBlock lang="css" code={`/* src/style.css */\n@strata base;\n@strata components;\n@strata utilities;`} />
    <CodeBlock lang="js" code={`// src/main.js (or main.ts)\nimport './style.css'`} />

    <h4 className="mt-4 mb-2">2. Register the plugin — plain Vite / Vue</h4>
    <CodeBlock
      lang="js"
      code={`// vite.config.js\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({\n  css: {\n    postcss: {\n      plugins: [require('strata-css')]\n    }\n  }\n})`}
    />

    <h4 className="mt-4 mb-2">Nuxt</h4>
    <p className="mb-3">
      Nuxt exposes the same Vite config under a <code>vite</code> key in{" "}
      <code>nuxt.config.ts</code>:
    </p>
    <CodeBlock
      lang="ts"
      code={`// nuxt.config.ts\nexport default defineNuxtConfig({\n  vite: {\n    css: {\n      postcss: {\n        plugins: [require('strata-css')]\n      }\n    }\n  }\n})`}
    />

    <h4 className="mt-4 mb-2">Astro</h4>
    <p className="mb-3">
      Astro forwards a <code>vite</code> key from <code>astro.config.mjs</code> the same way:
    </p>
    <CodeBlock
      lang="js"
      code={`// astro.config.mjs\nimport { defineConfig } from 'astro/config'\n\nexport default defineConfig({\n  vite: {\n    css: {\n      postcss: {\n        plugins: [require('strata-css')]\n      }\n    }\n  }\n})`}
    />

    <h4 className="mt-4 mb-2">SvelteKit</h4>
    <p className="mb-3">
      SvelteKit uses a standard <code>vite.config.js</code> at the project root — wire it exactly
      like the plain Vite example above.
    </p>

    <h4 className="mt-4 mb-2">Verify it's working</h4>
    <p className="mb-3">
      There's no CLI flag here — Strata reports through PostCSS&apos;s own warning system, which
      Vite prints straight to the terminal running <code>dev</code> or <code>build</code>. Watch
      for a <code>[strata]</code>-prefixed line if a class or content glob looks wrong.
    </p>
  </div>
);

const WEBPACK_TAB = (
  <div>
    <p className="mb-3">
      Run Strata through <code>postcss-loader</code> in your CSS rule, with the plugin declared
      in a standalone <code>postcss.config.js</code> — Webpack applies loaders right-to-left, so{" "}
      <code>postcss-loader</code> must come after <code>css-loader</code> in the{" "}
      <code>use</code> array, exactly as below.
    </p>

    <h4 className="mt-4 mb-2">1. Create the entry CSS file and import it</h4>
    <CodeBlock lang="css" code={`/* src/style.css */\n@strata base;\n@strata components;\n@strata utilities;`} />
    <CodeBlock lang="js" code={`// src/index.js\nimport './style.css'`} />

    <h4 className="mt-4 mb-2">2. Wire the loader chain</h4>
    <CodeBlock
      lang="js"
      code={`// webpack.config.js\nmodule.exports = {\n  module: {\n    rules: [{\n      test: /\\.css$/,\n      use: ['style-loader', 'css-loader', 'postcss-loader']\n    }]\n  }\n}`}
    />

    <h4 className="mt-4 mb-2">3. Register the plugin</h4>
    <CodeBlock
      lang="js"
      code={`// postcss.config.js\nmodule.exports = {\n  plugins: [require('strata-css')]\n}`}
    />

    <h4 className="mt-4 mb-2">Verify it's working</h4>
    <p className="mb-3">
      Same as Vite — Strata surfaces problems as PostCSS warnings, which show up in Webpack&apos;s
      own compile output whenever you run <code>webpack</code> or <code>webpack serve</code>.
    </p>
  </div>
);

const PLAIN_TAB = (
  <div>
    <p className="mb-3">
      No bundler PostCSS pipeline to hook into — plain HTML, PHP/Laravel, Django/Rails, or any
      other backend-rendered stack. Run the CLI directly and link the generated file like any
      static stylesheet.
    </p>

    <h4 className="mt-4 mb-2">1. Build once, or watch while you work</h4>
    <CodeBlock code={`npx strata-css --build`} lang="bash" />
    <CodeBlock code={`npx strata-css --watch`} lang="bash" />

    <h4 className="mt-4 mb-2">2. Link the output file</h4>
    <CodeBlock lang="html" code={`<link rel="stylesheet" href="/dist/strata.output.css">`} />

    <h4 className="mt-4 mb-2">3. Point content globs at your actual templates</h4>
    <p className="mb-3">
      The glob is the only filter — any extension it matches gets scanned, so Blade, Twig, ERB
      and Django templates all work without special-casing:
    </p>
    <CodeBlock
      lang="js"
      code={`module.exports = {\n  content: [\n    './resources/views/**/*.blade.php', // Laravel\n    './templates/**/*.{html,twig}',      // Django / Symfony\n    './app/views/**/*.erb',              // Rails\n  ],\n  input:  './strata.css',\n  output: './public/dist/strata.output.css',\n}`}
    />

    <h4 className="mt-4 mb-2">Verify it's working</h4>
    <CodeBlock
      lang="bash"
      code={`npx strata-css --build --verbose\n# [Strata]   scanned 35/35 matched file(s), 0 skipped, 788 class name(s) found`}
    />
    <p className="mb-3">
      For a deploy pipeline, run <code>strata-css --build</code> as its own step before your
      asset copy/publish step — treat it the same as any other CSS build command.
    </p>
  </div>
);

export default function InstallationPage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Installation</h1>
      <p className="mb-4">
        Install the package, then either let the installer wire everything up for you, or do it
        by hand if you want full control (or your setup is something the installer doesn&apos;t
        recognize).
      </p>

      <h2 className="mt-5 mb-3">1. Install from npm</h2>
      <CodeBlock code={`npm install strata-css`} lang="bash" />

      <h2 className="mt-5 mb-3">2. Scaffold it automatically (recommended)</h2>
      <p className="mb-3">
        Strata ships an interactive installer that does almost everything below for you. Run it
        from your project root:
      </p>
      <CodeBlock code={`npx strata-css init`} lang="bash" />
      <p className="mb-3">It detects your setup, then walks you through a few questions:</p>
      <ul className="mb-3">
        <li>
          <strong>Framework</strong> — read straight from <code>package.json</code>: Next.js,
          Astro, Nuxt, SvelteKit, Laravel (via <code>laravel-vite-plugin</code>), React+Vite,
          Vue+Vite. Anything else falls back to a generic setup.
        </li>
        <li>
          <strong>Module system</strong> (ESM vs CommonJS) and a <strong>sensible output path</strong>{" "}
          for your generated CSS — both inferred, not asked.
        </li>
        <li>
          <strong>What to install</strong> — Strata core only, core plus some or all of the
          companion packages (modal, offcanvas, skeleton-loader, chart), or packages on their own.
        </li>
        <li>
          Whether to <strong>auto-update your <code>package.json</code> scripts</strong>, and
          where your main layout file lives — it&apos;ll inject the <code>&lt;link&gt;</code>{" "}
          (and <code>&lt;script&gt;</code>, if you picked packages) tags for you.
        </li>
      </ul>
      <p className="mb-3">
        From there it writes <code>strata.config.js</code>, <code>postcss.config.js</code> and{" "}
        <code>strata.css</code>, updates your scripts, patches your layout file, and runs the
        first build — all in one pass.
      </p>
      <Callout variant="tip" title="It never runs npm install for you">
        Since v1.4.10 the CLI contains zero <code>child_process</code> calls, as a deliberate
        supply-chain hardening measure — any package installs it decides you need are printed to
        the terminal for you to run yourself, never executed automatically.
      </Callout>
      <p className="mb-3">
        That's the whole setup for most projects — you can skip straight to{" "}
        <a href="/guides/configuration">configuration</a> from here. Everything below is what{" "}
        <code>init</code> does under the hood, broken down by framework, for setups it
        doesn&apos;t recognize or if you&apos;d rather wire it up by hand.
      </p>

      <h2 className="mt-5 mb-3">3. Or wire it up by hand</h2>
      <p className="mb-3">
        Create a <code>strata.css</code> file (anywhere in your project — <code>strata.config.js</code>{" "}
        points at it) with the three Strata directives. Strata replaces these with generated CSS
        at build time — never hand-edit the output that replaces them:
      </p>
      <CodeBlock lang="css" code={`@strata base;\n@strata components;\n@strata utilities;`} />
      <p className="mb-3">
        Strata ships both a standalone CLI (<code>strata-css --build</code> /{" "}
        <code>--watch</code>) and a PostCSS plugin (<code>require(&apos;strata-css&apos;)</code>)
        you can drop into an existing pipeline. Which one applies depends entirely on your
        tooling — bundlers with their own PostCSS pipeline (Vite, Webpack) use the plugin
        directly; everything else runs the CLI as a build step.
      </p>

      <h2 className="mt-5 mb-3">4. Wire up your stack</h2>
      <FrameworkTabs
        tabs={[
          { id: "nextjs", label: "Next.js", content: NEXTJS_TAB },
          { id: "vite", label: "Vite / Vue / Nuxt / Astro / SvelteKit", content: VITE_TAB },
          { id: "webpack", label: "Webpack", content: WEBPACK_TAB },
          { id: "plain", label: "Plain HTML / PHP / Django / Rails", content: PLAIN_TAB },
        ]}
      />

      <p className="mt-5">
        Next, set up your <a href="/guides/configuration">configuration</a> so Strata knows
        exactly where to scan for class names.
      </p>
    </div>
  );
}
