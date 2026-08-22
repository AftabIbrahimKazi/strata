"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import DocsNavLinks from "./DocsNavLinks";
import SearchBar from "./SearchBar";

type OffcanvasApi = { open: (selector: string) => void; close: () => void };

export default function MobileNav() {
  const pathname = usePathname();
  const apiRef = useRef<OffcanvasApi | null>(null);
  // The drawer is portaled to document.body (see below) rather than rendered
  // inline, since it sits inside <header>, which applies a transform for the
  // auto-hide behavior — any transformed ancestor makes position:fixed
  // descendants fix relative to it instead of the viewport, so the drawer
  // would only cover the header's box instead of the full screen.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Loaded client-side only: the package's top-level document.addEventListener
  // calls aren't SSR-safe, so it must never run during server rendering.
  useEffect(() => {
    let cancelled = false;
    import("@strata-packages/offcanvas").then((mod) => {
      if (!cancelled) apiRef.current = mod.default;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        className="icon-btn d-lg-none"
        data-st-toggle="offcanvas"
        data-st-target="#mobile-nav-drawer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <div
            id="mobile-nav-drawer"
            className="offcanvas d-lg-none"
            data-st-side="left"
            aria-hidden="true"
            aria-modal="false"
          >
            <div className="offcanvas-header">
              <span className="offcanvas-title">Menu</span>
              <button type="button" aria-label="Close menu" className="btn-close" data-st-dismiss="offcanvas" />
            </div>
            <div className="offcanvas-body">
              <div className="mb-4">
                <SearchBar variant="mobile" />
              </div>
              <DocsNavLinks />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
