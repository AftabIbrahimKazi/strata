import type { Metadata } from "next";
import Callout from "@/components/Callout";
import CodeBlock from "@/components/CodeBlock";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Border Utilities",
  description: "Border presence, direction, width, color, and radius utilities, including a responsive named form most people miss.",
  alternates: { canonical: "/utilities/borders" },
};

export default function BordersPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Borders</h1>
      <p className="text-muted mb-4">
        Presence, direction, width, color, and radius — plus a named responsive form for
        directional borders that exists alongside the documented arbitrary-value one.
      </p>

      <h2 className="mt-5 mb-3">Presence &amp; direction</h2>
      <Playground classes={["border", "border-0", "border-top", "border-end", "border-bottom", "border-start"]} multi={false} bare />
      <p className="mb-3">
        <code>border-x</code>/<code>border-y</code> (both sides on an axis) exist alongside the
        four single-side classes, undocumented until now:
      </p>
      <Playground classes={["border-x", "border-y", "border-x-0", "border-y-0"]} multi={false} bare />

      <h3 className="mt-4 mb-2">Responsive directional borders — a named form, not just arbitrary</h3>
      <p className="mb-3">
        Beyond the documented arbitrary form (<code>border-top-[2px_dashed_red]</code>), every
        side also has a plain named responsive form that adds/removes the default 1px border at a
        breakpoint:
      </p>
      <CodeBlock lang="html" code={`<div class="border-top-md">1px top border from md up</div>\n<div class="border-top-md-0">removes it from md up</div>`} />

      <h2 className="mt-5 mb-3">Width &amp; color</h2>
      <Callout variant="tip" title="border-1…5 and border-{color} only work on top of an existing border">
        Both groups below set exactly one sub-property — <code>border-3</code> is just{" "}
        <code>border-width: 3px</code>, <code>border-danger</code> is just{" "}
        <code>border-color: var(--st-danger)</code> — neither touches{" "}
        <code>border-style</code>. Without a <code>border</code> (or <code>border-top</code>, etc.)
        already establishing <code>border-style: solid</code> somewhere, both are invisible: a
        width or color with no style is exactly as visible as no border at all. That&apos;s why
        these two demos keep the baseline border, unlike the ones above.
      </Callout>
      <Playground classes={["border-1", "border-2", "border-3", "border-4", "border-5"]} previewLabel="width" multi={false} />
      <Playground
        classes={["border-primary", "border-secondary", "border-success", "border-danger", "border-black", "border-white", "border-muted"]}
        previewLabel="color"
        multi={false}
      />

      <Callout variant="danger" title="border-opacity-* is dead — verified, not a rendering quirk">
        <code>border-opacity-10</code> through <code>border-opacity-75</code> exist and set{" "}
        <code>--st-border-opacity</code>, but nothing reads that variable back — same broken
        pattern as <code>bg-opacity-*</code> (<a href="/utilities/colors">Colors</a>) and{" "}
        <code>text-opacity-*</code> (<a href="/utilities/typography">Typography</a>). Use an
        arbitrary border color with an alpha value instead:{" "}
        <code>{"border-[1px_solid_rgba(220,53,69,0.5)]"}</code>.
      </Callout>

      <h2 className="mt-5 mb-3">Radius</h2>
      <Playground classes={["rounded", "rounded-0", "rounded-1", "rounded-2", "rounded-3", "rounded-4", "rounded-5", "rounded-circle", "rounded-pill"]} multi={false} bare />
      <Playground classes={["rounded-top", "rounded-end", "rounded-bottom", "rounded-start"]} previewLabel="per-side" multi={false} bare />
      <p className="mb-3">
        Both the plain radius scale and the per-side radius classes are responsive; the arbitrary
        form (<code>rounded-[8px_8px_0_0]</code>) is too, including per-side arbitrary (
        <code>rounded-top-[8px_8px_0_0]</code>).
      </p>

      <Callout variant="tip" title="No !important form anywhere in this group">
        Unlike spacing, sizing, and opacity, none of the border/radius/shadow classes have a named{" "}
        <code>!important</code> variant — not <code>border</code>, not{" "}
        <code>rounded</code>, not <code>shadow</code>. If you need to force one over a component
        style, reach for the arbitrary form, which does support the <code>!</code> prefix:{" "}
        <code>{"!rounded-[8px]"}</code>.
      </Callout>
    </div>
  );
}
