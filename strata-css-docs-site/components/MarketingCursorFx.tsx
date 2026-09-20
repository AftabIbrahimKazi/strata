"use client";

import { usePathname } from "next/navigation";
import CursorFx from "./CursorFx";

/**
 * Picks which CursorFX presets the marketing routes mount.
 *
 * Smoke is scoped to the 3D redesign hero only, the same way the glass header
 * is: it exists to extend the scene's airborne dust onto the DOM layer, so the
 * pointer stirs one continuous atmosphere instead of a canvas effect and a
 * page effect that happen to share a cursor. On a flat page there is nothing
 * for it to be continuous *with*, and it would just be smoke on a document.
 *
 * Colour is passed as a var() reference rather than a literal: the engine's
 * resolveVar() dereferences it against the document element, which keeps the
 * actual value in styles/components/cursorfx.css where the rest of the
 * CursorFX theming lives (and where it tracks the theme toggle for free).
 */
export default function MarketingCursorFx() {
  const isImmersiveHero = usePathname() === "/redesign";

  return (
    <CursorFx
      presets={
        isImmersiveHero
          ? {
              reveal: {},
              "line-wave": { thickness: 1 },
              smoke: {
                color: "var(--st-cfx-smoke-color, #e8d4a0)",
                // Tuned well below the preset's defaults. This sits on top of
                // a scene that already has volumetric dust of its own, so it
                // only has to add the near-field wisp the 3D field can't —
                // at stock strength the two atmospheres compete and the page
                // reads as foggy rather than dusty.
                opacity: 0.05,
                count: 9,
                rate: 3,
                size: 9,
                grow: 16,
                life: 1.4,
                curl: 34,
                jitter: 20,
              },
            }
          : { reveal: {}, "line-wave": { thickness: 1 } }
      }
    />
  );
}
