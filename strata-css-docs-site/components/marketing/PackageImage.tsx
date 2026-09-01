import PackageIcon from "./PackageIcon";

// Stand-in "demo image" per package — there are no real screenshots in the
// repo to pull from, so this is a styled panel (brand gradient + icon)
// rather than fabricated photography.
//
// The panel is a CursorFX Reveal target: the pointer opens a hole through the
// brand face to the banded cross-section beneath it. Reveal stacks every child
// in one grid cell and masks the LAST one, so the visible face goes last and
// the revealed layer first. The hole follows the pointer (the preset's default
// anchor) — it was briefly pinned to a corner, which read as broken tracking.
// Without the preset mounted (touch, reduced motion, script still loading) the
// top face is simply opaque and the card looks exactly as it did before.
export default function PackageImage({ slug }: { slug: string }) {
  return (
    <div
      className="packages-cube-reveal"
      data-st-cfx-target="reveal"
    >
      <div
        className="packages-cube-face packages-cube-face-under d-flex align-items-center justify-content-center"
        aria-hidden="true"
      >
        <div className="text-primary">
          <PackageIcon slug={slug} size={72} />
        </div>
      </div>

      <div className="packages-cube-face d-flex align-items-center justify-content-center">
        <div className="text-white">
          <PackageIcon slug={slug} size={72} />
        </div>
      </div>
    </div>
  );
}
