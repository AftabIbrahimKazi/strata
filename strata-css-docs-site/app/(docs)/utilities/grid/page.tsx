import type { Metadata } from "next";
import Callout from "@/components/Callout";
import CodeBlock from "@/components/CodeBlock";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Grid Utilities",
  description: "A 12-column responsive grid — containers, rows, columns, offsets, row-cols, and gutters.",
  alternates: { canonical: "/utilities/grid" },
};

export default function GridPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Grid</h1>
      <p className="text-muted mb-4">
        A Bootstrap-equivalent 12-column flexbox grid: containers, rows, columns, offsets, and a
        row-level auto-column shorthand most utility docs skip.
      </p>

      <h2 className="mt-5 mb-3">Containers</h2>
      <p className="mb-3">
        <code>container</code> grows its <code>max-width</code> at every breakpoint;{" "}
        <code>container-fluid</code> is always <code>100%</code>; <code>container-{"{bp}"}</code>{" "}
        stays fluid until that breakpoint, then locks to a max-width and keeps it at every larger
        breakpoint too:
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Class</th><th>max-width</th></tr>
          </thead>
          <tbody>
            <tr><td><code>container</code></td><td>fluid → 540px → 720px → 960px → 1140px → 1320px, at sm/md/lg/xl/xxl</td></tr>
            <tr><td><code>container-fluid</code></td><td>always 100%</td></tr>
            <tr><td><code>container-sm</code></td><td>fluid until 576px, then 540px→1320px climbing with viewport</td></tr>
            <tr><td><code>container-md</code></td><td>fluid until 768px, then 720px→1320px</td></tr>
            <tr><td><code>container-lg</code></td><td>fluid until 992px, then 960px→1320px</td></tr>
            <tr><td><code>container-xl</code></td><td>fluid until 1200px, then 1140px→1320px</td></tr>
            <tr><td><code>container-xxl</code></td><td>fluid until 1400px, then locks at 1320px</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-5 mb-3">Rows &amp; columns</h2>
      <Playground classes={["col-1", "col-2", "col-3", "col-4", "col-6", "col-12", "col-auto", "col"]} />
      <CodeBlock
        lang="html"
        code={`<div class="row">\n  <div class="col-4">1/3</div>\n  <div class="col-4">1/3</div>\n  <div class="col-4">1/3</div>\n</div>`}
      />
      <Callout variant="tip" title="col-xs-* exists as an explicit alias of col-*">
        Since <code>xs</code> is the unprefixed default, <code>col-xs-4</code> and{" "}
        <code>col-4</code> compile to the exact same rule — the <code>xs</code> form exists only
        for readers coming from frameworks that always spell out the smallest breakpoint.
      </Callout>

      <h2 className="mt-5 mb-3">row-cols — auto-sizing columns by count</h2>
      <p className="mb-3">
        Rather than sizing every child column individually, put <code>row-cols-{"{n}"}</code> on
        the row and every direct child is sized to <code>1/n</code> automatically. Goes from{" "}
        <code>row-cols-1</code> to <code>row-cols-6</code> (not 12), plus{" "}
        <code>row-cols-auto</code>, all responsive:
      </p>
      <CodeBlock
        lang="html"
        code={`<div class="row row-cols-3">\n  <div class="col">1/3</div>\n  <div class="col">1/3</div>\n  <div class="col">1/3</div>\n</div>`}
      />

      <h2 className="mt-5 mb-3">Offsets</h2>
      <p className="mb-3">
        <code>offset-0</code> through <code>offset-11</code>, all responsive:
      </p>
      <Playground classes={["offset-0", "offset-2", "offset-4", "offset-6"]} />

      <h2 className="mt-5 mb-3">Gutters</h2>
      <p className="mb-3">
        <code>g</code>/<code>gx</code>/<code>gy</code> set the <code>--st-gutter-x</code>/
        <code>--st-gutter-y</code> custom properties <code>.row</code> and <code>.container</code>{" "}
        read — same <code>0–5</code> scale as everything else, all responsive:
      </p>
      <Playground classes={["g-0", "g-3", "gx-3", "gy-3"]} />
      <Callout variant="tip" title="This is the same mechanism as the gap utilities, but not the same property">
        Gutters don&apos;t set <code>gap</code> — the grid uses negative margins on{" "}
        <code>.row</code> and matching padding on <code>.row {">"} *</code>, both driven by these
        two custom properties. See the <a href="/utilities/spacing">Spacing</a> page for the
        actual <code>gap</code>/<code>row-gap</code>/<code>col-gap</code> utilities, which are a
        different mechanism entirely.
      </Callout>
    </div>
  );
}
