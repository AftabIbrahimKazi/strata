import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Typography Utilities",
  description: "Text alignment, case, weight, style, decoration, line-height, wrapping, and link utilities.",
  alternates: { canonical: "/utilities/typography" },
};

export default function TypographyPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Typography</h1>
      <p className="text-muted mb-4">
        Text alignment, case, weight, style, line-height, and wrapping — plus an entire link
        utility family, and one class that looks like it should visibly do something and never
        does.
      </p>

      <h2 className="mt-5 mb-3">Alignment</h2>
      <Playground classes={["text-start", "text-center", "text-end", "text-justify"]} multi={false} />

      <h2 className="mt-5 mb-3">Case</h2>
      <Playground classes={["text-uppercase", "text-lowercase", "text-capitalize", "text-none"]} multi={false} />

      <h2 className="mt-5 mb-3">Weight</h2>
      <Playground
        classes={["fw-light", "fw-lighter", "fw-normal", "fw-medium", "fw-semibold", "fw-bold", "fw-bolder"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Style &amp; decoration</h2>
      <Playground
        classes={["fst-italic", "fst-normal", "text-decoration-none", "text-decoration-underline", "text-decoration-line-through"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Line height</h2>
      <Playground classes={["lh-1", "lh-sm", "lh-base", "lh-lg"]} multi={false} />

      <h2 className="mt-5 mb-3">Wrapping &amp; truncation</h2>
      <Playground classes={["text-truncate", "text-wrap", "text-nowrap", "text-break"]} previewLabel="This is a longer preview sentence to show wrapping behavior" multi={false} />
      <p className="mb-4">
        <code>text-reset</code> is also part of this set — it sets <code>color: inherit</code>{" "}
        and clears text-decoration, useful when a link or heading needs to give up its own color
        and pick up whatever its parent has instead.
      </p>

      <h2 className="mt-5 mb-3">Links</h2>
      <p className="mb-3">
        A full link color/decoration family, entirely separate from <code>text-{"{color}"}</code>{" "}
        — each includes its own darkened <code>:hover</code> state, which plain{" "}
        <code>text-*</code> classes don&apos;t:
      </p>
      <Playground
        classes={["link-primary", "link-secondary", "link-success", "link-danger", "link-warning", "link-info", "link-body-emphasis"]}
        previewLabel="hover me"
        multi={false}
      />
      <p className="mb-3">
        <code>link-offset-1</code>/<code>2</code>/<code>3</code> push the underline{" "}
        <code>2px</code>/<code>4px</code>/<code>6px</code> away from the text (
        <code>text-underline-offset</code>). <code>link-underline</code> forces the decoration on;{" "}
        <code>link-underline-{"{color}"}</code> tints just the underline, independent of the
        text&apos;s own color:
      </p>
      <Playground classes={["link-offset-1", "link-offset-2", "link-offset-3", "link-underline", "link-underline-danger"]} previewLabel="underlined text" multi={false} />

      <Callout variant="danger" title="text-opacity-* and bg-opacity-* are dead — verified, not a rendering quirk">
        <code>text-opacity-10</code> through <code>text-opacity-100</code> exist and set a custom
        property (<code>--st-text-opacity</code>), but grepping the entire framework source turns
        up zero rules that ever read that variable back — no <code>color-mix()</code>, no{" "}
        <code>rgba(var(...))</code>, nothing. The class compiles, applies to the element, and has
        no visible effect whatsoever. <code>bg-opacity-*</code> (covered on the{" "}
        <a href="/utilities/colors">Colors</a> page) and <code>border-opacity-*</code> (
        <a href="/utilities/borders">Borders</a>) have the exact same problem. If you need real
        opacity on a color, use an arbitrary value with an actual alpha channel instead:{" "}
        <code>{"text-[rgba(220,53,69,0.5)]"}</code>.
      </Callout>
      <Playground classes={["text-danger", "text-opacity-50"]} previewLabel="no visible change from text-opacity-50" multi={true} />
    </div>
  );
}
