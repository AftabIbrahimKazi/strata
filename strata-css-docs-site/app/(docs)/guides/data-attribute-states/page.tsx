import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data-Attribute State System Guide",
  description: "Drive interactive states — visible, collapsed, active, loading, disabled — with data-st-* attributes, no JS framework needed.",
  alternates: { canonical: "/guides/data-attribute-states" },
};

const ATTRS = [
  { attr: "data-st-visible", values: '"true" / "false"', effect: "Fade in/out (opacity + visibility + transform)" },
  { attr: "data-st-collapsed", values: '"true" / "false"', effect: "Expand/collapse (max-height + opacity)" },
  { attr: "data-st-active", values: "any", effect: "Adds transition to color/bg/border/shadow/transform" },
  { attr: "data-st-loading", values: '"true"', effect: "opacity 0.7, pointer-events none, cursor wait" },
  { attr: "data-st-disabled", values: '"true"', effect: "opacity 0.5, pointer-events none, cursor not-allowed" },
  { attr: "data-st-skeleton", values: '"true" / "false" / "null"', effect: "Shimmer overlay (managed by skeleton plugin)" },
];

export default function DataAttributeStatesPage() {
  return (
    <div>
      <h1 className="fw-bold mb-3">Data-Attribute State System</h1>
      <p className="mb-4">
        Interactive states are driven by <code>data-st-*</code> attributes — no JS framework
        needed. Attributes are never removed once present; their value changes instead (e.g.{" "}
        <code>data-st-active=&quot;true&quot;</code> → <code>data-st-active=&quot;false&quot;</code>).
        CSS targets attribute values, not class toggling.
      </p>

      <div className="table-responsive">
        <table className="table table-striped table-bordered">
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Values</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {ATTRS.map((row) => (
              <tr key={row.attr}>
                <td>
                  <code>{row.attr}</code>
                </td>
                <td>{row.values}</td>
                <td>{row.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
