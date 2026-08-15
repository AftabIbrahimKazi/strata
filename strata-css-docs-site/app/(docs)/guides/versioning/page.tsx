import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";
import VersionBumpDemo from "@/components/VersionBumpDemo";

export const metadata: Metadata = {
  title: "Versioning & Contributing Guide",
  description: "Strata CSS's MAJOR.FEATURE.BUGFIX versioning rules and how commits map to version bumps.",
  alternates: { canonical: "/guides/versioning" },
};

export default function VersioningPage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Versioning & Contributing</h1>
      <p className="mb-4">
        Strata follows a modified semantic versioning scheme: <code>MAJOR.FEATURE.BUGFIX</code>.
        The key difference from ordinary semver — FEATURE and BUGFIX are{" "}
        <strong>cumulative counters</strong>, not per-release resets. They only reset back to zero
        when MAJOR bumps.
      </p>

      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Segment</th><th>Meaning</th><th>Resets when…</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>MAJOR</code></td>
              <td>Design era — bumped only on a fundamental, every-user-must-update change.</td>
              <td>Never on its own — it&apos;s the thing doing the resetting.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>FEATURE</code></td>
              <td>Cumulative count of feature releases shipped since this MAJOR era began.</td>
              <td>Only when MAJOR bumps.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>BUGFIX</code></td>
              <td>Cumulative count of bugs fixed since this MAJOR era began.</td>
              <td>Only when MAJOR bumps.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mb-3">
        That means <code>1.5.12</code> is readable at a glance: era 1, 5 feature releases in, 12
        bugs fixed total across that whole era — not just since the last feature release.
      </p>

      <h2 className="mt-5 mb-3">Try it</h2>
      <p className="mb-3">
        Click commit types below to see how they move the version. Notice <code>fix:</code> and{" "}
        <code>feat:</code> both only ever count up — the only way either counter goes back to{" "}
        <code>0</code> is a <code>BREAKING:</code> commit, which resets both at once.
      </p>
      <VersionBumpDemo />

      <h2 className="mt-5 mb-3">Commit prefix → version impact</h2>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Prefix</th><th>Version impact</th><th>Example</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>feat:</code></td>
              <td className="text-nowrap">FEATURE++</td>
              <td><code>feat(select): add autoWidth option</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>fix:</code></td>
              <td className="text-nowrap">BUGFIX++</td>
              <td><code>fix(picker): correct scroll offset</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>BREAKING:</code></td>
              <td className="text-nowrap">MAJOR++ (resets FEATURE/BUGFIX)</td>
              <td><code>BREAKING: rename --st-primary tokens</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>docs:</code></td>
              <td className="text-nowrap">none</td>
              <td><code>docs: update CONTRIBUTING.md</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>refactor:</code></td>
              <td className="text-nowrap">none</td>
              <td><code>refactor(registry): simplify spacing loop</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>test:</code></td>
              <td className="text-nowrap">none</td>
              <td><code>test: add picker debug example</code></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>chore:</code></td>
              <td className="text-nowrap">none</td>
              <td><code>chore: update dependencies</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout variant="warning" title="A MAJOR bump requires a MIGRATION.md — no exceptions">
        Strata won&apos;t ship a MAJOR release without a migration doc committed alongside it. If
        you&apos;re proposing a <code>BREAKING:</code> change, write the migration guide as part
        of the same PR, not as a follow-up.
      </Callout>

      <h2 className="mt-5 mb-3">Branch pipeline</h2>
      <p className="mb-3">
        Only four branches exist, ever: <code>main</code>, <code>beta</code>, <code>test</code>,{" "}
        <code>dev</code>. There are no <code>feature/*</code> or <code>fix/*</code> branches —
        work commits directly onto <code>dev</code>, and promotion flows one direction only:
      </p>
      <CodeBlock lang="text" code={`dev → test → beta → main`} />
      <p className="mb-3">
        Each arrow is a PR, never a direct push — <code>main</code>, <code>beta</code>, and{" "}
        <code>test</code> are all protected. A build check (<code>node bin/strata.js --build</code>
        ) runs at every stage, and the final <code>beta → main</code> promotion additionally
        requires a review.
      </p>

      <h2 className="mt-5 mb-3">Pre-release tags</h2>
      <p className="mb-3">
        Only <code>beta</code> and <code>main</code> are ever published to npm — <code>dev</code>{" "}
        and <code>test</code> are internal integration/QA stages that never see a release.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Branch</th><th>Version format</th><th>npm tag</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-nowrap"><code>dev</code></td><td>—</td><td>not published</td></tr>
            <tr><td className="text-nowrap"><code>test</code></td><td>—</td><td>not published</td></tr>
            <tr><td className="text-nowrap"><code>beta</code></td><td className="text-nowrap"><code>1.2.3-beta.1</code></td><td className="text-nowrap"><code>--tag beta</code></td></tr>
            <tr><td className="text-nowrap"><code>main</code></td><td className="text-nowrap"><code>1.2.3</code></td><td className="text-nowrap"><code>--tag latest</code></td></tr>
          </tbody>
        </table>
      </div>
      <CodeBlock
        lang="bash"
        code={`npm install strata-css          # stable (latest)\nnpm install strata-css@beta     # beta`}
      />

      <h2 className="mt-5 mb-3">Package versioning is independent</h2>
      <p className="mb-3">
        Each companion package (<code>@strata-packages/forms</code>,{" "}
        <code>@strata-packages/picker</code>, etc.) versions on its own schedule between MAJOR
        releases — it only moves when it has its own changes, not because core bumped a FEATURE or
        BUGFIX number:
      </p>
      <CodeBlock
        lang="text"
        code={`strata-css              1.1.0  →  1.2.0  →  1.3.6\n@strata-packages/forms  1.0.0  →  1.1.3  →  (unchanged)\n@strata-packages/picker 1.0.0  →         →  1.1.0`}
      />
      <p className="mb-4">
        The one exception is a MAJOR bump: when <code>strata-css</code> releases{" "}
        <code>2.0.0</code>, every package ships a matching <code>2.0.0</code> build even if
        unchanged, to keep its peer-dependency range — the actual compatibility contract — honest:
      </p>
      <CodeBlock
        lang="json"
        code={`"peerDependencies": {\n  "strata-css": ">=1.0.0 <2.0.0"\n}`}
      />

      <Callout variant="tip" title="Full checklist and raw file">
        This page covers the mechanics; the complete publishing checklist, MAJOR-release
        requirements, and the exact commit format spec live in{" "}
        <a href="/policies/contributing">the Contributing policy page</a>, rendered directly from{" "}
        <code>CONTRIBUTING.md</code> at the repo root.
      </Callout>
    </div>
  );
}
