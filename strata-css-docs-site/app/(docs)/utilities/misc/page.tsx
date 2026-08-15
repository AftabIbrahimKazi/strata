import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Misc Utilities",
  description: "Cursor, z-index, pointer events, user select, and float utilities — including a responsive float form worth knowing about.",
  alternates: { canonical: "/utilities/misc" },
};

export default function MiscPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Misc</h1>
      <p className="text-muted mb-4">
        Cursor, z-index, pointer events, user select, and float. For gap/gutter spacing utilities,
        see the <a href="/utilities/spacing">Spacing</a> page instead.
      </p>

      <h2 className="mt-5 mb-3">Cursor</h2>
      <p className="mb-3">Responsive at every breakpoint:</p>
      <Playground
        classes={["cursor-auto", "cursor-default", "cursor-pointer", "cursor-wait", "cursor-text", "cursor-move", "cursor-not-allowed", "cursor-grab"]}
        multi={false}
      />
      <p className="mb-4">
        Plus an arbitrary form for anything not in that list: <code>cursor-[crosshair]</code>.
      </p>

      <h2 className="mt-5 mb-3">Z-index</h2>
      <Playground classes={["z-0", "z-1", "z-2", "z-3", "z-auto", "z-n1"]} multi={false} />
      <p className="mb-4">
        Plus arbitrary: <code>z-[100]</code>.
      </p>

      <h2 className="mt-5 mb-3">Pointer &amp; select</h2>
      <Playground classes={["pe-none", "pe-auto", "user-select-all", "user-select-auto", "user-select-none"]} multi={false} />

      <h2 className="mt-5 mb-3">Float</h2>
      <Playground classes={["float-start", "float-end", "float-none", "clearfix"]} multi={false} />
      <Callout variant="tip" title="float-{bp}-start / -end / -none exist too">
        Undocumented until now: every float class has a responsive form (
        <code>float-md-end</code>) — floats can change direction, or turn off, at a breakpoint
        just like display or flex-direction can.
      </Callout>

      <h3 className="mt-4 mb-2">Stacks</h3>
      <p className="mb-3">
        <code>hstack</code>/<code>vstack</code> are small flex-container shorthands — a
        horizontal or vertical stack with sensible defaults (centered cross-axis, stretched
        alignment), not a scale of any kind:
      </p>
      <Playground classes={["hstack", "vstack"]} multi={false} />
    </div>
  );
}
