import { LAYERS } from "./layers";

/**
 * One panel per stratum, all stacked in the same spot — Strata's own
 * data-st-visible attribute handles the cross-fade (opacity + transform),
 * so switching the active layer is just flipping which panel is "true"
 * rather than mounting/unmounting content.
 */
export function LayerCopy({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="container position-relative z-1 text-center text-white">
      {LAYERS.map((layer, i) => (
        <div
          key={layer.label}
          data-st-visible={i === activeIndex ? "true" : "false"}
          className={i === activeIndex ? "position-relative" : "position-absolute inset-0"}
        >
          <p className="text-primary fw-bold mb-2">{layer.label}</p>
          <p className="mb-0 max-w-[560px] mx-auto text-white">{layer.line}</p>
        </div>
      ))}
    </div>
  );
}
