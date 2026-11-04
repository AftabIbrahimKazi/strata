import { LAYERS } from "./layers";

/**
 * The overlay instrumentation that sits over the 3D scene: a depth gauge, a
 * telemetry readout, a scroll affordance and a loading state.
 *
 * The visual language is deliberately "geological survey equipment" —
 * monospace, thin rules, coordinates, depth in km — so the UI reads as part
 * of the expedition rather than as a website chrome bolted over a render.
 *
 * A note on why every gauge here is built from discrete ticks rather than a
 * scaled bar: this codebase bans inline styles, and a continuously-sized
 * fill needs a per-frame numeric width, which means either `style` or a CSS
 * custom property (also inline). Quantising to N ticks means every state is
 * one of two literal class strings, which is both scannable by Strata's JIT
 * and, as it happens, a better fit for the instrument look.
 */

/** The rail's stops: the surface, then each stratum the descent passes. */
const RAIL_STOPS = [
  { label: "Surface", depth: "0.0 km" },
  ...LAYERS.map((layer, i) => ({
    // "Crust — Utility classes" -> "Crust"; the rail wants the place, not the
    // concept (the concept is already in the copy overlay at that depth).
    label: layer.label.split("—")[0].trim(),
    depth: `${(1.05 * (i + 1)).toFixed(1)} km`,
  })),
];

const MINOR_TICKS_PER_STOP = 5;
const TOTAL_ROWS = RAIL_STOPS.length * (MINOR_TICKS_PER_STOP + 1);

/** Total descent depth the readouts count up to, matching the depth labels
 * used by the landing sections below the hero. */
export const MAX_DEPTH_KM = 4.2;

export function depthForProgress(progress: number): string {
  return `${(progress * MAX_DEPTH_KM).toFixed(1)} km`;
}

/**
 * Right-hand depth gauge. Ticks below the current progress are lit, so the
 * boundary between lit and unlit *is* the position indicator — no separately
 * positioned dot to keep in sync.
 */
export function DepthRail({ progress }: { progress: number }) {
  const litRows = progress * TOTAL_ROWS;

  return (
    <div
      className="position-fixed end-0 top-50 translate-middle-y me-3 me-lg-4 d-none d-md-flex flex-column align-items-end gap-1 z-[1030] pe-none"
      aria-hidden="true"
    >
      {RAIL_STOPS.map((stop, stopIndex) => {
        const majorRow = stopIndex * (MINOR_TICKS_PER_STOP + 1);
        const isReached = litRows >= majorRow;
        const isActive =
          litRows >= majorRow && litRows < majorRow + MINOR_TICKS_PER_STOP + 1;

        return (
          <div key={stop.label} className="d-flex flex-column align-items-end gap-1">
            <div className="d-flex align-items-center gap-2">
              <span
                className={
                  isActive
                    ? "hero-hud-label font-monospace fs-[0.62rem] text-uppercase text-primary fw-bold"
                    : isReached
                      ? "hero-hud-label font-monospace fs-[0.62rem] text-uppercase text-[rgba(255,255,255,0.75)]"
                      : "hero-hud-label font-monospace fs-[0.62rem] text-uppercase text-[rgba(255,255,255,0.3)]"
                }
              >
                {stop.label}
              </span>
              <span
                className={
                  isReached
                    ? "hero-tick d-block w-[22px] h-[2px] bg-[var(--st-primary)]"
                    : "hero-tick d-block w-[22px] h-[2px] bg-[rgba(255,255,255,0.22)]"
                }
              />
            </div>

            {Array.from({ length: MINOR_TICKS_PER_STOP }, (_, minorIndex) => {
              const row = majorRow + minorIndex + 1;
              return (
                <span
                  key={minorIndex}
                  className={
                    litRows >= row
                      ? "hero-tick d-block w-[10px] h-[1px] bg-[rgba(255,138,26,0.75)]"
                      : "hero-tick d-block w-[10px] h-[1px] bg-[rgba(255,255,255,0.14)]"
                  }
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Bottom-left telemetry readout — coordinates of the real Namibian
 * formation the model was scanned from, plus live depth. */
export function SceneHUD({ progress, phase }: { progress: number; phase: string }) {
  return (
    <div
      className="position-fixed bottom-0 start-0 m-3 m-lg-4 d-none d-sm-block font-monospace fs-[0.62rem] text-[rgba(255,255,255,0.55)] z-[1030] pe-none"
      aria-hidden="true"
    >
      <p className="hero-hud-label mb-1 text-uppercase">Lat 18.5204° N</p>
      <p className="hero-hud-label mb-1 text-uppercase">Lon 73.8567° E</p>
      <p className="hero-hud-label mb-1 text-uppercase">
        <span className="text-[rgba(255,255,255,0.35)]">Depth </span>
        <span className="text-primary">{depthForProgress(progress)}</span>
      </p>
      <p className="hero-hud-label mb-0 text-uppercase">
        <span className="text-[rgba(255,255,255,0.35)]">Status </span>
        {phase}
      </p>
    </div>
  );
}

/** Scroll affordance. Without one, a pinned 750vh track just looks like a
 * page that refuses to move. */
export function ScrollHint({ visible }: { visible: boolean }) {
  // Mounted/unmounted rather than faded — see the note in Hero3D on why
  // data-st-visible isn't trusted for the persistent overlays.
  if (!visible) return null;

  return (
    <div
      className="position-fixed bottom-0 start-50 translate-middle-x mb-4 d-flex flex-column align-items-center gap-2 z-[1030] pe-none"
      aria-hidden="true"
    >
      <span className="hero-hud-label font-monospace fs-[0.62rem] text-uppercase text-[rgba(255,255,255,0.7)]">
        Scroll to descend
      </span>
      <svg
        className="hero-chevron"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/**
 * Covers the scene until the rock model is in. A cold load is genuinely
 * 10–20s (multi-MB GLB plus a PMREM environment bake), and without this the
 * visitor spends that time looking at an empty sky wondering if it's broken.
 */
export function LoadingOverlay({ progress, done }: { progress: number; done: boolean }) {
  const SEGMENTS = 28;
  const lit = Math.round(progress * SEGMENTS);

  return (
    <div
      className={
        done
          ? "hero-loading position-fixed inset-0 z-[1080] d-flex flex-column align-items-center justify-content-center bg-[#0a0705] pe-none hero-loading-done"
          : "hero-loading position-fixed inset-0 z-[1080] d-flex flex-column align-items-center justify-content-center bg-[#0a0705]"
      }
      role="status"
      aria-live="polite"
    >
      <p className="hero-hud-label font-monospace fs-[0.68rem] text-uppercase text-primary mb-3">
        Strata geological survey
      </p>

      <div className="d-flex align-items-center gap-1 mb-3" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={
              i < lit
                ? "hero-tick d-block w-[6px] h-[14px] bg-[var(--st-primary)]"
                : "hero-tick d-block w-[6px] h-[14px] bg-[rgba(255,255,255,0.12)]"
            }
          />
        ))}
      </div>

      <p className="font-monospace fs-[0.62rem] text-uppercase text-[rgba(255,255,255,0.5)] mb-0 hero-hud-label">
        {done ? "Survey ready" : `Loading terrain — ${Math.round(progress * 100)}%`}
      </p>
    </div>
  );
}
