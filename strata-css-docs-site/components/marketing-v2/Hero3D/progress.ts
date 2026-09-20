/**
 * Single source of truth for how the hero's scroll distance splits into
 * phases. Both the 3D scene (camera path) and the page (copy overlay,
 * track height) read from here — every camera bug so far has come from
 * two files disagreeing about what a given scroll fraction means.
 */
export const ORBIT_VH = 220;
export const DIVE_VH = 90;
export const LAYER_VH = 110;
/** Must equal LAYERS.length in layers.ts — two crusts, two mantles, two cores. */
export const LAYER_COUNT = 6;

export const TOTAL_VH = ORBIT_VH + DIVE_VH + LAYER_VH * LAYER_COUNT;

/** Progress fraction [0,1] where the surface orbit ends and the dive starts. */
export const ORBIT_END = ORBIT_VH / TOTAL_VH;
/** Progress fraction where the dive ends and the layer descent starts. */
export const DIVE_END = (ORBIT_VH + DIVE_VH) / TOTAL_VH;

/** Which layer index [0, LAYER_COUNT) the given progress is inside, or null before the descent starts. */
export function layerIndexForProgress(progress: number): number | null {
  if (progress < DIVE_END) return null;
  const t = (progress - DIVE_END) / (1 - DIVE_END);
  return Math.min(LAYER_COUNT - 1, Math.floor(t * LAYER_COUNT));
}
