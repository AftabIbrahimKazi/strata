import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Display Utilities",
  description: "Control an element's display type — named values, responsive variants, and print-only display overrides.",
  alternates: { canonical: "/utilities/display" },
};

const DISPLAY_VALUES = [
  { cls: "d-none", value: "none" },
  { cls: "d-inline", value: "inline" },
  { cls: "d-inline-block", value: "inline-block" },
  { cls: "d-block", value: "block" },
  { cls: "d-grid", value: "grid" },
  { cls: "d-inline-grid", value: "inline-grid" },
  { cls: "d-flex", value: "flex" },
  { cls: "d-inline-flex", value: "inline-flex" },
  { cls: "d-table", value: "table" },
];

const PRINT_VALUES = [
  "d-print-none",
  "d-print-inline",
  "d-print-inline-block",
  "d-print-block",
  "d-print-grid",
  "d-print-flex",
  "d-print-inline-flex",
  "d-print-table",
  "d-print-table-row",
  "d-print-table-cell",
];

export default function DisplayPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Display</h1>
      <p className="text-muted mb-4">
        Sets an element&apos;s <code>display</code> property. Most values are responsive; two are
        a documented exception, and there&apos;s a separate print-only set most utility docs skip
        entirely.
      </p>

      <h2 className="mt-5 mb-3">Named values</h2>
      <p className="mb-3">
        Nine base values, each responsive (<code>d-md-none</code>, <code>d-lg-flex</code>, …) at
        every breakpoint:
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Class</th><th>display value</th></tr>
          </thead>
          <tbody>
            {DISPLAY_VALUES.map((d) => (
              <tr key={d.cls}>
                <td><code>{d.cls}</code></td>
                <td><code>{d.value}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Playground
        classes={["d-none", "d-inline", "d-inline-block", "d-block", "d-grid", "d-inline-grid", "d-flex", "d-inline-flex", "d-table"]}
      />
      <Playground classes={["d-sm-none", "d-md-block", "d-lg-flex", "d-xl-inline-grid"]} previewLabel="responsive" />

      <h2 className="mt-5 mb-3">Table-row / table-cell — not responsive</h2>
      <p className="mb-3">
        <code>d-table-row</code> and <code>d-table-cell</code> exist, but they&apos;re registered
        outside the loop that builds the nine values above — so unlike every other display class,{" "}
        <strong>they have no breakpoint variants at all</strong>. <code>d-md-table-cell</code>{" "}
        looks like it should exist by analogy with <code>d-md-block</code>, but it doesn&apos;t;
        the lookup fails silently, same as any other unregistered class.
      </p>
      <Playground classes={["d-table-row", "d-table-cell"]} previewLabel="not responsive" />
      <Callout variant="warning" title="d-md-table-cell etc. don't exist">
        If you need a table-display element to change at a breakpoint, there&apos;s no built-in
        way — reach for the arbitrary-value-free alternative of restructuring the layout, or an
        inline style if it&apos;s truly a one-off.
      </Callout>

      <h2 className="mt-5 mb-3">Print display</h2>
      <p className="mb-3">
        A complete, separate set — 10 classes, each wrapped in <code>@media print</code>, letting
        you show or hide elements (or change their display type) specifically when a page is
        printed. None of these are responsive to viewport breakpoints; the only condition is
        print vs. screen:
      </p>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {PRINT_VALUES.map((cls) => (
          <code key={cls} className="badge-light">
            {cls}
          </code>
        ))}
      </div>
      <Callout variant="tip" title="Test these via the browser's print preview, not this page">
        Since they only apply inside <code>@media print</code>, toggling them here on-screen has
        no visible effect — that&apos;s correct behavior, not a bug. Use{" "}
        <code>Ctrl/Cmd+P</code> → print preview to see them take effect. A common pattern:{" "}
        <code>d-print-none</code> on navigation/sidebars, <code>d-print-block</code> on a
        print-only summary.
      </Callout>

      <h2 className="mt-5 mb-3">What display doesn&apos;t have</h2>
      <p className="mb-3">
        Unlike spacing, display utilities have no <code>!important</code> variant — there&apos;s
        no <code>!d-none</code>. There&apos;s also no arbitrary-value form; every valid{" "}
        <code>display</code> keyword already has a named class, so brackets were never added for
        this group. <code>d-[revert]</code> or similar won&apos;t work.
      </p>
    </div>
  );
}
