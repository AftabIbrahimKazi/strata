import type { Metadata } from "next";
import Callout from "@/components/Callout";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "Flexbox Utilities",
  description: "Flex container and item utilities — direction, wrap, justify/align, order, and grow/shrink — with responsive coverage that isn't uniform across the group.",
  alternates: { canonical: "/utilities/flexbox" },
};

export default function FlexboxPage() {
  return (
    <div>
      <h1 className="fw-bold mb-2">Flexbox</h1>
      <p className="text-muted mb-4">
        Flex container and item utilities. Responsive coverage looks uniform at a glance but
        genuinely isn&apos;t — a few classes are quiet exceptions, called out below rather than
        left for you to discover the hard way.
      </p>

      <h2 className="mt-5 mb-3">Direction &amp; wrap</h2>
      <p className="mb-3">
        <code>flex-row</code>, <code>flex-column</code>, <code>flex-wrap</code>,{" "}
        <code>flex-nowrap</code>, plus the reverse pair <code>flex-row-reverse</code>/
        <code>flex-column-reverse</code> — all six responsive:
      </p>
      <Playground
        classes={["flex-row", "flex-column", "flex-row-reverse", "flex-column-reverse", "flex-wrap", "flex-nowrap"]}
      />
      <Playground classes={["flex-sm-column", "flex-md-row", "flex-lg-wrap"]} previewLabel="responsive" />
      <Callout variant="warning" title="flex-wrap-reverse is the odd one out — no responsive form">
        <code>flex-wrap-reverse</code> exists as a base class, but it&apos;s registered
        separately from its five siblings above and never entered into the responsive-variant
        loop. <code>flex-md-wrap-reverse</code> doesn&apos;t exist, even though every other
        wrap/direction class in this section does have that form.
      </Callout>
      <Playground classes={["flex-wrap-reverse"]} previewLabel="no responsive form" />

      <h2 className="mt-5 mb-3">Grow &amp; shrink</h2>
      <p className="mb-3">
        <code>flex-fill</code>, <code>flex-grow-0</code>/<code>flex-grow-1</code>,{" "}
        <code>flex-shrink-0</code>/<code>flex-shrink-1</code> —{" "}
        <strong>none of these five have a responsive form at all</strong>, unlike the
        direction/wrap classes above. <code>flex-md-grow-1</code> doesn&apos;t exist.
      </p>
      <Playground classes={["flex-fill", "flex-grow-0", "flex-grow-1", "flex-shrink-0", "flex-shrink-1"]} />

      <h2 className="mt-5 mb-3">Justify content</h2>
      <p className="mb-3">Responsive at every breakpoint:</p>
      <Playground
        classes={[
          "justify-content-start",
          "justify-content-end",
          "justify-content-center",
          "justify-content-between",
          "justify-content-around",
          "justify-content-evenly",
        ]}
      />
      <Playground classes={["justify-content-sm-start", "justify-content-lg-between"]} previewLabel="responsive" multi={false} />

      <h2 className="mt-5 mb-3">Align items</h2>
      <p className="mb-3">Responsive at every breakpoint:</p>
      <Playground
        classes={["align-items-start", "align-items-end", "align-items-center", "align-items-baseline", "align-items-stretch"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Align content</h2>
      <p className="mb-3">
        Controls spacing between wrapped rows/columns — only meaningful with{" "}
        <code>flex-wrap</code> and more than one row of content.{" "}
        <strong>No responsive variants exist for this group</strong>, unlike align-items/
        align-self/justify-content next to it:
      </p>
      <Playground
        classes={["align-content-start", "align-content-center", "align-content-end", "align-content-between", "align-content-around", "align-content-stretch"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Align self</h2>
      <p className="mb-3">Responsive at every breakpoint:</p>
      <Playground
        classes={["align-self-auto", "align-self-start", "align-self-end", "align-self-center", "align-self-baseline", "align-self-stretch"]}
        multi={false}
      />

      <h2 className="mt-5 mb-3">Order</h2>
      <p className="mb-3">
        A full numeric scale, <code>order-0</code> through <code>order-5</code>, plus{" "}
        <code>order-first</code> and <code>order-last</code> — all responsive. Neither of the
        named pair is a special CSS keyword: <code>order-first</code> is just{" "}
        <code>order: -1</code> (one below the lowest named value), and <code>order-last</code> is{" "}
        <code>order: 6</code> (one above the highest) — plain numeric tricks, not
        framework magic.
      </p>
      <Playground classes={["order-first", "order-0", "order-1", "order-2", "order-3", "order-4", "order-5", "order-last"]} />
      <Playground classes={["order-sm-first", "order-md-3", "order-lg-last"]} previewLabel="responsive" />

      <h2 className="mt-5 mb-3">What flexbox utilities don&apos;t have</h2>
      <p className="mb-3">
        No class in this entire group has an <code>!important</code> variant, and none of them
        have an arbitrary-value form — there&apos;s no <code>order-[7]</code> or{" "}
        <code>flex-grow-[2]</code>. If you need a value outside the named scale, it has to go
        through a component-level class or inline style.
      </p>
    </div>
  );
}
