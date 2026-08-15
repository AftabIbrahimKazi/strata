import type { Metadata } from "next";
import Callout from "@/components/Callout";
import CodeBlock from "@/components/CodeBlock";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Position Utilities",
  description: "Positioning scheme, named offsets, and layout helpers — fixed/sticky headers, centering, and inset shortcuts.",
  alternates: { canonical: "/utilities/position" },
};

export default function PositionPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Position</h1>
      <p className="text-muted mb-4">
        The positioning scheme, a named offset scale, and the helper classes built on top of
        them — including a responsive sticky form that&apos;s easy to miss.
      </p>

      <h2 className="mt-5 mb-3">Scheme</h2>
      <p className="mb-3">
        <code>static</code> and <code>relative</code> stay in normal document flow, so they&apos;re
        safe to compare directly:
      </p>
      <Playground classes={["position-static", "position-relative"]} multi={false} />
      <Callout variant="tip" title="absolute/fixed/sticky aren't demoed the same way — not because they're broken">
        Toggling <code>position-absolute</code> or <code>position-fixed</code> live on a box like
        the one above removes it from flex flow, so it shrinks to fit its content instead of
        stretching to fill the row (758px → ~104px in testing) — a real, confusing side effect of
        the isolated demo, not of the class itself. <code>position-fixed</code> additionally
        detaches the box from this page and pins it to the viewport. Both are demonstrated properly
        in context instead: <code>position-absolute</code> in{" "}
        <a href="#centering">Centering</a> below, <code>position-fixed</code>/
        <code>position-sticky</code> as the named{" "}
        <a href="#helpers">Helpers</a> classes just after this section.
      </Callout>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {["position-absolute", "position-fixed", "position-sticky"].map((cls) => (
          <code key={cls} className="badge-light">
            {cls}
          </code>
        ))}
      </div>
      <p className="mb-4">
        Each has a named <code>!important</code> variant (<code>!position-sticky</code>), and{" "}
        <code>position-md-sticky</code>-style responsive forms.
      </p>

      <h2 className="mt-5 mb-3">Offsets</h2>
      <p className="mb-3">
        <code>top</code>/<code>bottom</code>/<code>start</code>/<code>end</code>, each at{" "}
        <code>0</code>/<code>50%</code>/<code>100%</code> — <code>start</code>/<code>end</code>{" "}
        map to <code>left</code>/<code>right</code>:
      </p>
      <Callout variant="tip" title="Offsets do nothing without a position other than static">
        <code>top</code>/<code>bottom</code>/<code>start</code>/<code>end</code> only move an
        element under <code>position-relative</code>, <code>position-absolute</code>, or{" "}
        <code>position-fixed</code>/<code>position-sticky</code> — on the default{" "}
        <code>position: static</code>, they compile and apply but have zero visible effect,
        which is why they aren&apos;t demoed live on this page.
      </Callout>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {["top-0", "top-50", "top-100", "bottom-0", "start-0", "end-0"].map((cls) => (
          <code key={cls} className="badge-light">
            {cls}
          </code>
        ))}
      </div>
      <p className="mb-4">
        Beyond the named scale, arbitrary offsets work on all four sides plus a combined{" "}
        <code>inset</code> shorthand: <code>top-[var(--h)]</code>, <code>left-[10px]</code>,{" "}
        <code>inset-[0_1rem]</code>. There&apos;s also a bare <code>inset-0</code> named class,
        separate from the arbitrary form.
      </p>

      <h2 className="mt-5 mb-3" id="helpers">Helpers</h2>
      <p className="mb-3">
        <code>fixed-top</code>/<code>fixed-bottom</code>/<code>sticky-top</code>/
        <code>sticky-bottom</code> — reference only below, not a live demo: applying real{" "}
        <code>position: fixed</code>/<code>sticky</code> inside a docs page makes the preview box
        detach from its container and pin to the actual viewport, which breaks the rest of the
        page rather than demonstrating anything useful.
      </p>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {["fixed-top", "fixed-bottom", "sticky-top", "sticky-bottom"].map((cls) => (
          <code key={cls} className="badge-light">
            {cls}
          </code>
        ))}
      </div>
      <Callout variant="tip" title="sticky-{bp}-top / sticky-{bp}-bottom exist too">
        Beyond the base <code>sticky-top</code>/<code>sticky-bottom</code>, there&apos;s a
        responsive form most utility references (including this one, until now) leave out:{" "}
        <code>sticky-md-top</code> only becomes sticky from the <code>md</code> breakpoint up —
        useful for a header that scrolls normally on mobile but sticks on desktop.
      </Callout>

      <h3 className="mt-4 mb-2" id="centering">Centering</h3>
      <p className="mb-3">
        Paired with <code>position-absolute</code> + a <code>50%</code> offset, these correct for
        the element&apos;s own size using a negative transform — the classic centered-badge/dot
        pattern. Shown here inside a bounded <code>position-relative</code> container, which is
        the context these classes actually assume; applied to a bare box with nothing around it
        (as a naive live-toggle demo would), the shift just overlaps whatever is above/left of it:
      </p>
      <div className="border rounded p-4 mb-4 bg-[var(--st-bg-secondary)]">
        <div className="position-relative d-inline-block rounded-circle bg-primary w-[64px] h-[64px]">
          <span className="position-absolute top-0 end-0 translate-middle rounded-circle bg-danger border border-white d-block w-[16px] h-[16px]" />
        </div>
      </div>
      <CodeBlock
        lang="html"
        code={`<div class="position-relative d-inline-block rounded-circle">\n  <img class="rounded-circle" src="avatar.jpg" alt="" />\n  <span class="position-absolute top-0 end-0 translate-middle rounded-circle bg-danger">\n    <!-- unread-count dot, centered exactly on the avatar's corner -->\n  </span>\n</div>`}
      />
    </div>
  );
}
