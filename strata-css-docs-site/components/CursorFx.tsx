"use client";

import { useEffect } from "react";

/**
 * Mounts CursorFX presets for the subtree it sits in.
 *
 * The package's own declarative path (`data-st-cursorfx` on <body>) is not used
 * here: under a bundler the engine's autoInit runs the moment its module is
 * evaluated, which is before any preset module has had a chance to register
 * itself — preset files only self-attach to a browser global, and there is no
 * global in this build. So presets are registered with `use()` and mounted
 * imperatively, and no `data-st-cursorfx` attribute exists anywhere in the
 * site's markup. Targets are still declarative: `data-st-cfx-target="…"`.
 *
 * Reduced motion needs no handling here — the engine refuses to start its loop
 * under `prefers-reduced-motion: reduce`, and each preset's CSS neutralises its
 * own animation.
 *
 * Colour, radius and every other purely visual knob are deliberately NOT passed
 * here — they live in styles/components/cursorfx.css as --st-cfx-* properties.
 * The presets write an inline property only where an option differs from its
 * default, and inline style beats a stylesheet, so passing a colour in JS would
 * silently disable the per-theme tuning that file does.
 */

type PresetKey = "reveal" | "line-wave";

type Options = Record<string, string | number | boolean>;

// LineWave's defaults are already the reference divider's constants (amplitude
// 5, cycles 1.75, travel 1.4, 1.1s, 2.5px glow), so almost nothing is passed.
// `thickness` is the exception: it sets the mask's SVG stroke-width as well as
// the element's box, so a CSS-only override would leave the two out of step.
// Everything else — colour, opacity — is themed from CSS.

// CJS modules under interop: the namespace object carries `default`, but a
// bundler that hands back the raw exports object is equally valid.
function unwrap<T>(mod: T | { default: T }): T {
  return (mod as { default?: T }).default ?? (mod as T);
}

export default function CursorFx({ presets }: { presets: Partial<Record<PresetKey, Options>> }) {
  // Serialised so a caller passing an inline object literal — which every one
  // of them does — doesn't remount the engine on each render.
  const spec = JSON.stringify(presets);

  useEffect(() => {
    // On a touch device these animate on tap and nothing else, while the
    // engine still installs pointer listeners and holds a particle pool.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const wanted = JSON.parse(spec) as Partial<Record<PresetKey, Options>>;
    let engine: CursorFxEngine | null = null;
    let cancelled = false;

    Promise.all([
      import("@strata-packages/cursorfx"),
      wanted.reveal ? import("@strata-packages/cursorfx/presets/reveal") : null,
      wanted["line-wave"] ? import("@strata-packages/cursorfx/presets/line-wave") : null,
    ]).then(([core, ...loaded]) => {
      if (cancelled) return;

      const fx = unwrap(core);
      engine = fx;
      fx.init();

      for (const mod of loaded) {
        if (!mod) continue;
        const preset = unwrap(mod);
        fx.use(preset);
        fx.mount(preset, wanted[preset.key as PresetKey] ?? {});
      }
    });

    return () => {
      cancelled = true;
      // destroy() unmounts every instance, drops the canvas and removes the
      // engine's document listeners — a route change must not leave them.
      if (engine) engine.destroy();
    };
  }, [spec]);

  return null;
}
