/**
 * Replaces a static `border-top` / `border-bottom` with a CursorFX LineWave
 * line. LineWave draws a visible rule at rest, so the divider looks exactly
 * like the border it replaced until the pointer crosses it — the border class
 * comes off wherever this goes in, or the two would show as a double line.
 *
 * It sits on the container's edge, absolutely positioned and pulled out by half
 * its height, so the line lands exactly where the border was and the layout is
 * untouched. The height is the hit zone: a 1px rule is impossible to
 * point at, which is why the reference implementation used the same 24px band.
 *
 * The parent must be positioned; callers add `position-relative` unless they
 * are already sticky or relative.
 *
 * No options are passed anywhere: LineWave's defaults already are the reference
 * divider's constants, and the colour comes from the theme via CSS.
 */
export default function WaveRule({ edge = "top" }: { edge?: "top" | "bottom" }) {
  return (
    <div
      className={edge === "bottom" ? "wave-rule wave-rule-bottom" : "wave-rule"}
      aria-hidden="true"
      data-st-cfx-target="line-wave"
    />
  );
}
