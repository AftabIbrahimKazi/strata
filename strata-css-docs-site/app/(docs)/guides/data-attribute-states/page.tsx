import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";
import AttributeDemo from "@/components/AttributeDemo";

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
  { attr: "data-st-shake", values: '"true"', effect: "One-off shake animation on .modal-dialog (invalid-submit feedback)" },
  { attr: "data-st-side", values: '"left" / "right" / "top" / "bottom"', effect: "Which edge .offcanvas slides in from" },
];

export default function DataAttributeStatesPage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Data-Attribute State System</h1>
      <p className="mb-3">
        Interactive states are driven by <code>data-st-*</code> attributes — no JS framework
        needed. Attributes are never removed once present; their value changes instead (e.g.{" "}
        <code>data-st-active=&quot;true&quot;</code> → <code>data-st-active=&quot;false&quot;</code>).
        CSS targets attribute values, not class toggling.
      </p>
      <p className="mb-4">
        Toggling the attribute is <strong>your</strong> job — a line of JS like{" "}
        <code>{"el.setAttribute('data-st-visible', 'true')"}</code> — Strata only supplies the CSS
        that reacts to the value once it changes. The exception is Strata&apos;s own component
        packages: <code>@strata-packages/modal</code>, <code>@strata-packages/offcanvas</code>,{" "}
        <code>@strata-packages/skeleton-loader</code>, and the built-in accordion/dropdown/toast markup
        already toggle these attributes for you internally — you only reach for the raw pattern
        below when building your own interactive element from scratch.
      </p>

      <Callout variant="tip" title="Not gated by the JIT scanner">
        Utility and component classes only ship if the scanner finds them as a literal in your
        source (or you <code>safelist</code> them). These attribute selectors are different —
        they&apos;re declared directly under <code>@layer st-base</code> in{" "}
        <code>src/layers/base.js</code>, which is always part of the output. You never need to
        write <code>data-st-visible=&quot;true&quot;</code> anywhere in your source for the CSS to
        exist; it&apos;s there unconditionally, the same way the reset and theme tokens are.
      </Callout>

      <div className="table-responsive mb-4">
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

      <h2 className="mt-5 mb-3">data-st-visible</h2>
      <p className="mb-3">
        Fades and slides an element in or out instead of an instant show/hide. Backs modals,
        toasts, and dropdown menus out of the box.
      </p>
      <AttributeDemo
        attr="data-st-visible"
        values={["true", "false"]}
        initial="true"
        content={{
          true: (
            <div data-st-visible="true" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm text-center">
              Toggle me
            </div>
          ),
          false: (
            <div data-st-visible="false" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm text-center">
              Toggle me
            </div>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<div data-st-visible="true">\n  Toggle me\n</div>`}
      />
      <CodeBlock
        lang="js"
        code={`el.setAttribute('data-st-visible', 'true')   // show\nel.setAttribute('data-st-visible', 'false')  // hide`}
      />

      <h2 className="mt-5 mb-3">data-st-collapsed</h2>
      <p className="mb-3">
        Expands or collapses an element via <code>max-height</code> + <code>opacity</code> —
        what accordions and collapsible panels use under the hood.
      </p>
      <AttributeDemo
        attr="data-st-collapsed"
        values={["false", "true"]}
        initial="false"
        content={{
          false: (
            <div data-st-collapsed="false" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm w-100">
              This panel expands and collapses. Content that would otherwise be hidden still
              exists in the DOM — it&apos;s just clipped by <code>overflow: hidden</code> and{" "}
              <code>max-height: 0</code>.
            </div>
          ),
          true: (
            <div data-st-collapsed="true" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm w-100">
              This panel expands and collapses. Content that would otherwise be hidden still
              exists in the DOM — it&apos;s just clipped by <code>overflow: hidden</code> and{" "}
              <code>max-height: 0</code>.
            </div>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<div data-st-collapsed="false">\n  Panel content — present in the DOM even while collapsed.\n</div>`}
      />
      <CodeBlock
        lang="js"
        code={`el.setAttribute('data-st-collapsed', 'false')  // expand\nel.setAttribute('data-st-collapsed', 'true')   // collapse`}
      />

      <h2 className="mt-5 mb-3">data-st-loading / data-st-disabled</h2>
      <p className="mb-3">
        Both dim the element and swap the cursor — <code>loading</code> uses <code>wait</code>,{" "}
        <code>disabled</code> uses <code>not-allowed</code>. Either one also sets{" "}
        <code>pointer-events: none</code>, so clicks don&apos;t need a separate guard in your
        handler.
      </p>
      <AttributeDemo
        attr="data-st-loading"
        values={["false", "true"]}
        initial="false"
        content={{
          false: (
            <button type="button" className="btn-primary">
              Submit
            </button>
          ),
          true: (
            <button type="button" data-st-loading="true" className="btn-primary">
              Submit
            </button>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<button class="btn-primary" data-st-loading="true">Submit</button>`}
      />
      <AttributeDemo
        attr="data-st-disabled"
        values={["false", "true"]}
        initial="false"
        content={{
          false: (
            <button type="button" className="btn-secondary">
              Delete
            </button>
          ),
          true: (
            <button type="button" data-st-disabled="true" className="btn-secondary">
              Delete
            </button>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<button class="btn-secondary" data-st-disabled="true">Delete</button>`}
      />

      <h2 className="mt-5 mb-3">data-st-active</h2>
      <p className="mb-3">
        Unlike the others, <code>data-st-active</code> has no baked-in visual effect on its own —
        it only adds a <code>transition</code> for color/background/border/shadow/transform, so
        whatever style change you drive with your own CSS (or an inline style) animates smoothly
        instead of snapping. The attribute&apos;s value can be anything; only its presence
        matters.
      </p>
      <CodeBlock
        lang="css"
        code={`/* data-st-active only adds the transition — you supply the actual state styles */\n.my-widget[data-st-active="true"] {\n  background: var(--st-primary);\n}`}
      />

      <h2 className="mt-5 mb-3">data-st-skeleton</h2>
      <p className="mb-3">
        Renders a shimmering placeholder overlay in place of real content. The CSS ships in core
        Strata, but the plugin that manages toggling it on and off based on your data-loading
        state — <code>&quot;true&quot;</code> / <code>&quot;false&quot;</code> /{" "}
        <code>&quot;null&quot;</code> — is a separate install.
      </p>
      <AttributeDemo
        attr="data-st-skeleton"
        values={["false", "true"]}
        initial="true"
        content={{
          true: (
            <div data-st-skeleton="true" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm w-[220px]">
              <p className="mb-2">Loaded headline text</p>
              <p className="mb-0 text-muted">and a shorter line under it.</p>
            </div>
          ),
          false: (
            <div data-st-skeleton="false" className="p-3 bg-[var(--st-bg)] border rounded shadow-sm w-[220px]">
              <p className="mb-2">Loaded headline text</p>
              <p className="mb-0 text-muted">and a shorter line under it.</p>
            </div>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<div data-st-skeleton="true">\n  <p>This text is replaced by a shimmer bar until data arrives.</p>\n</div>`}
      />
      <Callout variant="tip" title="Requires @strata-packages/skeleton-loader for the JS side">
        The <code>[data-st-skeleton]</code> CSS (shimmer keyframe, overlay, per-element-type
        handling for links/buttons/media) lives in core Strata and works with a bare{" "}
        <code>data-st-skeleton=&quot;true&quot;</code> in your markup. Automatically wiring that
        attribute up to real async state — swapping it to <code>&quot;false&quot;</code> once data
        arrives — is what <code>@strata-packages/skeleton-loader</code> does.
      </Callout>

      <h2 className="mt-5 mb-3">data-st-shake</h2>
      <p className="mb-3">
        Component-specific rather than generic — it&apos;s only wired up on{" "}
        <code>.modal-dialog</code>, as feedback for &quot;you clicked the backdrop / pressed Esc
        on a modal that won&apos;t dismiss.&quot; It&apos;s momentary, not a persistent state like
        the attributes above: set it to <code>&quot;true&quot;</code>, let the 0.25s animation
        play, then remove it (or set it back to <code>&quot;false&quot;</code>) so it can retrigger
        next time.
      </p>
      <AttributeDemo
        attr="data-st-shake"
        values={["false", "true"]}
        initial="false"
        content={{
          false: (
            <div className="p-3 bg-[var(--st-bg)] border rounded shadow-sm text-center w-[200px]">
              modal-dialog
            </div>
          ),
          true: (
            <div
              data-st-shake="true"
              className="p-3 bg-[var(--st-bg)] border rounded shadow-sm text-center w-[200px] docs-demo-shake"
            >
              modal-dialog
            </div>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<div class="modal" aria-hidden="false" data-st-shake="true">\n  <div class="modal-dialog">…</div>\n</div>`}
      />
      <CodeBlock
        lang="js"
        code={`modal.setAttribute('data-st-shake', 'true')\nsetTimeout(() => modal.removeAttribute('data-st-shake'), 250) // matches the 0.25s animation`}
      />

      <h2 className="mt-5 mb-3">data-st-side</h2>
      <p className="mb-3">
        Sets which edge an <code>.offcanvas</code> panel slides in from. Unlike the state
        attributes above, this one isn&apos;t toggled at runtime to animate anything by itself —
        it&apos;s set once (usually straight in the markup) to configure the panel, and{" "}
        <code>aria-hidden</code> is what actually opens/closes it.
      </p>
      <AttributeDemo
        attr="data-st-side"
        values={["left", "right", "top", "bottom"]}
        initial="left"
        content={{
          left: (
            <div className="position-relative border rounded w-100 h-[140px]">
              <div className="bg-[var(--st-bg)] border rounded shadow-sm d-flex align-items-center justify-content-center position-absolute top-0 bottom-0 start-0 w-[42%]">
                offcanvas
              </div>
            </div>
          ),
          right: (
            <div className="position-relative border rounded w-100 h-[140px]">
              <div className="bg-[var(--st-bg)] border rounded shadow-sm d-flex align-items-center justify-content-center position-absolute top-0 bottom-0 end-0 w-[42%]">
                offcanvas
              </div>
            </div>
          ),
          top: (
            <div className="position-relative border rounded w-100 h-[140px]">
              <div className="bg-[var(--st-bg)] border rounded shadow-sm d-flex align-items-center justify-content-center position-absolute top-0 start-0 end-0 h-[42%]">
                offcanvas
              </div>
            </div>
          ),
          bottom: (
            <div className="position-relative border rounded w-100 h-[140px]">
              <div className="bg-[var(--st-bg)] border rounded shadow-sm d-flex align-items-center justify-content-center position-absolute bottom-0 start-0 end-0 h-[42%]">
                offcanvas
              </div>
            </div>
          ),
        }}
      />
      <CodeBlock
        lang="html"
        code={`<div class="offcanvas" data-st-side="right" aria-hidden="true">\n  <div class="offcanvas-header">…</div>\n  <div class="offcanvas-body">…</div>\n</div>`}
      />
    </div>
  );
}
