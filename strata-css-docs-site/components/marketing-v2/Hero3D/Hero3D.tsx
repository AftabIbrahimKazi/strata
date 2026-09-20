"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import HeroFallback, { HeroCopy } from "./HeroFallback";
import { LayerCopy } from "./PhaseCopy";
import { DepthRail, SceneHUD, ScrollHint, LoadingOverlay } from "./HeroUI";
import { layerIndexForProgress, ORBIT_END, DIVE_END, TOTAL_VH } from "./progress";

// ssr: false must live inside a Client Component in this Next.js version —
// it throws if used from a Server Component's dynamic() call.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/**
 * The 3D scene is a fixed, full-viewport backdrop sitting behind the entire
 * page — z-n1 puts it below the "auto" stacking layer that Header, Footer
 * and normal page content live in, so they read as the foreground over an
 * immersive backdrop rather than "a page with a hero graphic in it."
 *
 * The scroll track below is invisible scaffolding: it doesn't hold the
 * canvas, it just reserves TOTAL_VH of scroll distance (orbit + dive +
 * four-layer descent — see progress.ts) so HeroScene has somewhere to read
 * progress from, and pins the copy overlay while that happens.
 */
export default function Hero3D() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [enable3D, setEnable3D] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hasWebGL = false;
    try {
      const canvas = document.createElement("canvas");
      hasWebGL = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      hasWebGL = false;
    }
    const use3D = !reducedMotion && hasWebGL;
    setEnable3D(use3D);
    // Nothing is going to load on the fallback path, so don't leave the
    // loading cover sitting over a static gradient forever.
    if (!use3D) setReady(true);
  }, []);

  // When the 3D scene is running it owns scroll progress and pushes it here
  // (see HeroScene's onProgress). This listener is only for the fallback path,
  // where no frame loop exists to read it — running both at once is exactly
  // what previously let the two readers disagree.
  useEffect(() => {
    if (enable3D) return;
    const readProgress = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);
    };
    window.addEventListener("scroll", readProgress, { passive: true });
    readProgress();
    return () => window.removeEventListener("scroll", readProgress);
  }, [enable3D]);

  const handleLoadProgress = useCallback((fraction: number) => setLoadProgress(fraction), []);
  const handleReady = useCallback(() => setReady(true), []);

  // The track's height is a hardcoded utility class (see below) that has to
  // equal TOTAL_VH. Getting it wrong doesn't throw — it silently rescales the
  // whole descent, so every phase boundary lands somewhere other than where
  // progress.ts says it does. Dev-only; costs nothing in production.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const track = trackRef.current;
    if (!track) return;
    const expected = (TOTAL_VH / 100) * window.innerHeight;
    const actual = track.getBoundingClientRect().height;
    if (Math.abs(actual - expected) > 2) {
      console.warn(
        `[Hero3D] scroll track is ${Math.round(actual)}px but progress.ts expects ` +
          `${Math.round(expected)}px (TOTAL_VH=${TOTAL_VH}). Update the h-[…vh] class to match.`
      );
    }
  }, []);

  const activeLayerIndex = layerIndexForProgress(progress);
  const phase =
    progress < ORBIT_END ? "Surface" : progress < DIVE_END ? "Descending" : "Subsurface";

  return (
    <>
      <a href="#after-hero" className="skip-hero">
        Skip the descent sequence
      </a>

      <div className="position-fixed inset-0 z-n1" aria-hidden="true">
        {enable3D ? (
          <HeroScene
            trackRef={trackRef}
            onLoadProgress={handleLoadProgress}
            onReady={handleReady}
            onProgress={setProgress}
          />
        ) : (
          <HeroFallback />
        )}
      </div>

      {enable3D && <LoadingOverlay progress={loadProgress} done={ready} />}
      <DepthRail progress={progress} />
      <SceneHUD progress={progress} phase={phase} />
      <ScrollHint visible={ready && progress < 0.015} />

      {/* h-[970vh] must match progress.ts's TOTAL_VH (220 orbit + 90 dive +
          110*6 layers). It can't be interpolated: a template-literal class
          isn't visible to Strata's JIT scanner as a literal, so the value is
          hardcoded and kept in sync by hand — with the dev-only assertion
          above catching it when someone (twice now) forgets. */}
      <div ref={trackRef} data-hero-track="true" className="position-relative h-[970vh]">
        <div className="position-sticky sticky-top vh-100 d-flex align-items-center">
          {/* The scene runs from a bright midday sky down to near-black
              underground, so text-white copy needs a scrim underneath it
              always, not a fixed dark background. */}
          <div
            className="position-absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_50%,rgba(0,0,0,0.7)_100%)]"
            aria-hidden="true"
          />
          {/* Conditionally rendered rather than faded with data-st-visible.
              The attribute reliably drives the per-layer panels below, but on
              these two persistent overlays the computed style kept disagreeing
              with the attribute (measured: data-st-visible="false" sitting at
              opacity 1), leaving the hero copy painted on top of the layer
              copy. Mounting is unambiguous, and the phase boundary it swaps on
              is already a hard cut in the scene. */}
          {activeLayerIndex === null && (
            <div className="position-absolute inset-0 d-flex align-items-center">
              <HeroCopy />
            </div>
          )}
          {activeLayerIndex !== null && (
            <div className="position-absolute inset-0 d-flex align-items-center">
              <LayerCopy activeIndex={activeLayerIndex} />
            </div>
          )}
        </div>
      </div>

      <div id="after-hero" />
    </>
  );
}
