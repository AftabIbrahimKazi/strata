import type { Metadata } from "next";
import Callout from "@/components/Callout";
import CodeBlock from "@/components/CodeBlock";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Arbitrary Value Utilities",
  description: "A complete reference of every arbitrary-value pattern — which support responsive breakpoints, which support !important, and which support neither.",
  alternates: { canonical: "/utilities/arbitrary-values" },
};

const RESPONSIVE_YES = [
  { pattern: "m-[...] / p-[...] / mt-[...] / px-[...] / etc.", example: "px-[2rem]", note: "Full 14-prefix spacing family — see Spacing" },
  { pattern: "gap-[...] / row-gap-[...] / col-gap-[...]", example: "gap-[1rem_2rem]", note: "See Spacing" },
  { pattern: "g-[...] / gx-[...] / gy-[...]", example: "gx-[2rem]", note: "Grid gutters — see Grid" },
  { pattern: "border-[...] / border-top-[...] / border-x-[...] / etc.", example: "border-top-[2px_dashed_red]", note: "See Borders" },
  { pattern: "rounded-[...] / rounded-top-[...] / etc.", example: "rounded-[8px_8px_0_0]", note: "See Borders" },
  { pattern: "shadow-[...]", example: "shadow-[0_4px_6px_rgba(0,0,0,.1)]", note: "" },
  { pattern: "outline-[...]", example: "outline-[2px_dashed_red]", note: "" },
  { pattern: "gtc-[...] / gtr-[...]", example: "gtc-[260px_1fr]", note: "grid-template-columns/rows" },
];

const RESPONSIVE_NO = [
  { pattern: "w-[...] / h-[...] / max-w-[...] / min-w-[...] / max-h-[...] / min-h-[...]", example: "w-[320px]", note: "See Sizing" },
  { pattern: "text-[...]", example: "text-[#e63946]", note: "Length unit → font-size, else → color" },
  { pattern: "fs-[...]", example: "fs-[1.25rem]", note: "Always font-size, no ambiguity" },
  { pattern: "bg-[...]", example: "bg-[linear-gradient(...)]", note: "Uses background shorthand, not background-color" },
  { pattern: "opacity-[...]", example: "opacity-[0.3]", note: "" },
  { pattern: "z-[...]", example: "z-[100]", note: "" },
  { pattern: "fw-[...]", example: "fw-[350]", note: "" },
  { pattern: "top-[...] / bottom-[...] / left-[...] / right-[...] / inset-[...]", example: "inset-[0_1rem]", note: "See Position" },
  { pattern: "object-position-[...]", example: "object-position-[center_top]", note: "" },
];

const NO_IMPORTANT = [
  { pattern: "transition-[...]", example: "transition-[background-color_0.3s_ease]" },
  { pattern: "duration-[...]", example: "duration-[400ms]" },
  { pattern: "cursor-[...]", example: "cursor-[crosshair]" },
];

export default function ArbitraryValuesPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Arbitrary Values</h1>
      <p className="text-muted mb-4">
        Any utility not covered by a named class can be expressed with square brackets — the
        value inside is used directly, with underscores standing in for spaces in multi-token
        values. What isn&apos;t consistent across the ~24 arbitrary-capable prefixes is which of
        them also support a responsive breakpoint prefix and the <code>!important</code>{" "}
        prefix — this page is the full answer.
      </p>
      <Playground classes={["w-[320px]", "max-w-[440px]", "bg-[#f0f4f8]"]} />
      <CodeBlock lang="html" code={`<div class="w-[320px] bg-[#f0f4f8]">…</div>`} />

      <h2 className="mt-5 mb-3">Support responsive breakpoints (and !important)</h2>
      <p className="mb-3">
        <code>{"{prefix}-{bp}-[value]"}</code> and <code>{"!{prefix}-[value]"}</code> both work:
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Pattern</th><th>Example</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {RESPONSIVE_YES.map((r) => (
              <tr key={r.pattern}>
                <td><code>{r.pattern}</code></td>
                <td><code>{r.example}</code></td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-5 mb-3">No responsive form (bare + !important only)</h2>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Pattern</th><th>Example</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {RESPONSIVE_NO.map((r) => (
              <tr key={r.pattern}>
                <td><code>{r.pattern}</code></td>
                <td><code>{r.example}</code></td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="warning" title="transition-[...], duration-[...], and cursor-[...] don't support the ! prefix at all">
        Every other arbitrary pattern on this page accepts a leading <code>!</code> for{" "}
        <code>!important</code>. These three are the only exceptions — their regex simply
        doesn&apos;t include the optional <code>!</code> group, so{" "}
        <code>!transition-[...]</code> doesn&apos;t compile to anything; it just fails the lookup
        like a typo would.
      </Callout>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Pattern</th><th>Example</th></tr>
          </thead>
          <tbody>
            {NO_IMPORTANT.map((r) => (
              <tr key={r.pattern}>
                <td><code>{r.pattern}</code></td>
                <td><code>{r.example}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-5 mb-3">Multi-value vs. single-value</h2>
      <p className="mb-3">
        Whether a prefix accepts a multi-token, underscore-separated value depends entirely on
        whether it maps to a CSS shorthand property or a longhand one — this trips people up most
        often on spacing (<code>p-[10px_20px]</code> works, <code>px-[10px_20px]</code> doesn&apos;t).
        See the <a href="/utilities/spacing">Spacing</a> page for the full explanation.
      </p>
    </div>
  );
}
