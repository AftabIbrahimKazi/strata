import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Sizing Utilities",
  description: "Width and height utilities, including max/min constraints, viewport units, and a missing responsive form worth knowing about.",
  alternates: { canonical: "/utilities/sizing" },
};

export default function SizingPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Sizing</h1>
      <p className="text-muted mb-4">
        Width and height on a percentage scale, plus max/min constraints and viewport units.
      </p>

      <h2 className="mt-5 mb-3">Width &amp; height</h2>
      <p className="mb-3">
        <code>25</code>/<code>50</code>/<code>75</code>/<code>100</code>/<code>auto</code>, each
        responsive and with a named <code>!important</code> form (<code>!w-50</code>):
      </p>
      <Playground classes={["w-25", "w-50", "w-75", "w-100", "w-auto"]} previewLabel="width" multi={false} />
      <Playground classes={["h-25", "h-50", "h-75", "h-100", "h-auto"]} previewLabel="height" multi={false} />

      <h2 className="mt-5 mb-3">Max / min width</h2>
      <Playground classes={["max-w-xs", "max-w-sm", "max-w-md", "max-w-lg", "max-w-xl", "max-w-full", "max-w-none"]} multi={false} />
      <Playground classes={["min-w-0", "min-w-full", "min-w-screen"]} multi={false} />

      <h2 className="mt-5 mb-3">Max / min height</h2>
      <Playground classes={["max-h-full", "max-h-screen", "max-h-none"]} multi={false} />
      <Playground classes={["min-h-0", "min-h-full", "min-h-screen"]} multi={false} />

      <h2 className="mt-5 mb-3">Viewport</h2>
      <p className="mb-3">
        <code>min-vw-100</code> exists alongside <code>min-vh-100</code>, undocumented until now
        — same idea, horizontal axis:
      </p>
      <Playground classes={["mw-100", "mh-100", "vw-100", "vh-100", "min-vw-100", "min-vh-100"]} multi={false} />

      <h2 className="mt-5 mb-3">Arbitrary values</h2>
      <p className="mb-3">
        <code>w-[320px]</code>, <code>max-w-[440px]</code>, <code>min-h-[600px]</code>, etc. —
        each also accepts the <code>!</code> prefix (<code>!w-[320px]</code>).
      </p>
      <Callout variant="warning" title="Arbitrary sizing has no responsive form">
        Unlike spacing and gap, none of the sizing arbitrary patterns support a breakpoint prefix
        — there&apos;s no <code>w-md-[320px]</code>. If you need a different arbitrary width per
        breakpoint, you&apos;ll need a named class at each breakpoint (<code>w-md-50</code>) or a
        component-level media query.
      </Callout>
    </div>
  );
}
