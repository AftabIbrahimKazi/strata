"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DocsNavLinks from "./DocsNavLinks";
import SearchBar from "./SearchBar";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        className="icon-btn d-lg-none"
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="offcanvas-backdrop" onClick={() => setOpen(false)} />

      <div className="offcanvas d-lg-none" data-st-side="left" aria-hidden={!open}>
        <div className="offcanvas-header">
          <span className="offcanvas-title">Menu</span>
          <button type="button" aria-label="Close menu" className="btn-close" onClick={() => setOpen(false)} />
        </div>
        <div className="offcanvas-body">
          <div className="mb-4">
            <SearchBar variant="mobile" />
          </div>
          <DocsNavLinks />
        </div>
      </div>
    </>
  );
}
