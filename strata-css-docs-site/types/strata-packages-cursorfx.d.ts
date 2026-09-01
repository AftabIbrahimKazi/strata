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
