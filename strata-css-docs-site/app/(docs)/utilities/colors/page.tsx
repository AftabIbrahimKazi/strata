import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Color Utilities",
  description: "Text and background color utilities — theme palette, subtle variants, and body/emphasis extras.",
  alternates: { canonical: "/utilities/colors" },
};

export default function ColorsPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Colors</h1>
      <p className="text-muted mb-4">
        Text and background colors from the theme palette, plus two extra families most people
        never find: subtle tinted variants, and a dead opacity family that looks functional but
        isn&apos;t.
      </p>

      <h2 className="mt-5 mb-3">Text color</h2>
      <Playground
        classes={["text-primary", "text-secondary", "text-success", "text-danger", "text-warning", "text-info", "text-light", "text-dark", "text-white", "text-muted", "text-body"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Background color</h2>
      <Playground
        classes={["bg-primary", "bg-secondary", "bg-success", "bg-danger", "bg-warning", "bg-info", "bg-light", "bg-dark", "bg-white", "bg-transparent", "bg-body"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Subtle variants</h2>
      <p className="mb-3">
        A tinted, low-opacity pair per theme color — a soft background with a matching soft
        border, meant to sit together (think alert/badge backgrounds that don&apos;t shout).
        Undocumented anywhere until now:
      </p>
      <Playground
        classes={["bg-primary-subtle", "bg-success-subtle", "bg-danger-subtle", "bg-warning-subtle"]}
        previewLabel="subtle bg"
        multi={false}
      />
      <Playground
        classes={["border-primary-subtle", "border-success-subtle", "border-danger-subtle", "border-warning-subtle"]}
        previewLabel="subtle border"
        multi={false}
      />

      <h2 className="mt-5 mb-3">Body &amp; emphasis extras</h2>
      <p className="mb-3">
        Beyond the base palette: three body-surface variants, three body-text variants, plain
        black/white (fixed, not theme-aware), and a semantic-color-darkened &quot;emphasis&quot;
        variant of six colors:
      </p>
      <Playground
        classes={["bg-body-secondary", "bg-body-tertiary", "bg-black", "bg-gradient"]}
        previewLabel="bg extras"
        multi={false}
      />
      <Playground
        classes={["text-body-secondary", "text-body-tertiary", "text-body-emphasis", "text-black", "text-white-50"]}
        previewLabel="text extras"
        multi={false}
      />
      <Playground
        classes={["text-primary-emphasis", "text-success-emphasis", "text-danger-emphasis"]}
        previewLabel="darkened emphasis"
        multi={false}
      />

      <Callout variant="danger" title="bg-opacity-* is dead — verified, not a rendering quirk">
        <code>bg-opacity-10</code> through <code>bg-opacity-100</code> exist and set{" "}
        <code>--st-bg-opacity</code>, but nothing in the framework ever reads that variable back —
        no <code>bg-{"{color}"}</code> rule uses it in a <code>color-mix()</code> or{" "}
        <code>rgba()</code>. The class applies and changes nothing. Same story for{" "}
        <code>text-opacity-*</code> (<a href="/utilities/typography">Typography</a>) and{" "}
        <code>border-opacity-*</code> (<a href="/utilities/borders">Borders</a>). For real
        translucency, use an arbitrary background with an alpha value instead:{" "}
        <code>{"bg-[rgba(13,110,253,0.5)]"}</code>.
      </Callout>
      <Playground classes={["bg-primary", "bg-opacity-25"]} previewLabel="no visible change from bg-opacity-25" multi={true} />
    </div>
  );
}
