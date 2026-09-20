/**
 * Hand-written types for @strata-packages/cursorfx — the package ships plain
 * UMD JS with no declarations. Only the surface this site uses is described:
 * register a preset, init the engine, mount, tear down.
 */

interface CursorFxPreset {
  name: string;
  key: string;
  type: "canvas" | "dom";
}

interface CursorFxInstance {
  unmount: () => void;
}

interface CursorFxEngine {
  version: string;
  init: (opts?: Record<string, unknown>) => CursorFxEngine;
  use: (preset: CursorFxPreset) => CursorFxEngine;
  mount: (preset: CursorFxPreset, options?: Record<string, unknown>) => CursorFxInstance | null;
  destroy: () => void;
  get: (key: string) => CursorFxInstance | null;
}

declare module "@strata-packages/cursorfx" {
  const engine: CursorFxEngine;
  export default engine;
}

declare module "@strata-packages/cursorfx/presets/reveal" {
  const preset: CursorFxPreset;
  export default preset;
}

declare module "@strata-packages/cursorfx/presets/line-wave" {
  const preset: CursorFxPreset;
  export default preset;
}

declare module "@strata-packages/cursorfx/presets/magnetic" {
  const preset: CursorFxPreset;
  export default preset;
}

declare module "@strata-packages/cursorfx/presets/smoke" {
  const preset: CursorFxPreset;
  export default preset;
}

/**
 * The particle pipeline and its behaviour files are imported purely for their
 * side effects — loading one registers it with the pipeline. Nothing here
 * consumes a value from them, so they're declared without a meaningful shape.
 * Smoke is a recipe over these three; without them its behaviour registry is
 * empty and mounting it does nothing.
 */
declare module "@strata-packages/cursorfx/particles";
declare module "@strata-packages/cursorfx/behaviours/origin/pointer";
declare module "@strata-packages/cursorfx/behaviours/motion/curl";
declare module "@strata-packages/cursorfx/behaviours/render/puff";
