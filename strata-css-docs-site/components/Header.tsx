"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";
import MobileNav from "./MobileNav";
import WaveRule from "./WaveRule";

const NEAR_TOP_THRESHOLD = 120;
// Once the header is translated off-screen, it has nothing left under the
// cursor to trigger onMouseEnter — so hover-to-reveal is detected via
// cursor proximity to the top edge of the viewport instead, not hovering
// the (invisible) header element itself.
const CURSOR_REVEAL_ZONE = 40;

export default function Header() {
  const [nearTop, setNearTop] = useState(true);
  // Two independent reasons to stay revealed, tracked separately because they
  // disagree: proximity is only ever true in the top 40px, while the pointer
  // can legitimately sit anywhere inside the 70px header — including on the
  // WaveRule, which hangs 12px below it. Collapsing both into one flag let the
  // proximity handler clear a hover the header itself had just set, so moving
  // down from the reveal zone onto the divider hid the header out from under
  // the cursor.
  const [nearEdge, setNearEdge] = useState(false);
  const [overHeader, setOverHeader] = useState(false);

  useEffect(() => {
    function onScroll() {
      setNearTop(window.scrollY < NEAR_TOP_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      setNearEdge(e.clientY <= CURSOR_REVEAL_ZONE);
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const visible = nearTop || nearEdge || overHeader;

  return (
    <header
      className="navbar sticky-top bg-body p-3 d-flex flex-nowrap align-items-center justify-content-between gap-3 header-autohide"
      data-header-hidden={!visible}
      onMouseEnter={() => setOverHeader(true)}
      onMouseLeave={() => setOverHeader(false)}
    >
      {/* sticky-top is already a containing block, so the band needs no
          position-relative of its own. */}
      <WaveRule edge="bottom" />
      <div className="d-flex align-items-center gap-4">
        <MobileNav />
        <Link href="/" className="navbar-brand fw-bold text-decoration-none d-flex align-items-center gap-2">
          <Logo />
          strata
        </Link>

        <div className="d-flex align-items-center gap-3">
          <Link href="/docs" prefetch={false} className="d-none d-sm-inline text-link">
            Docs
          </Link>
          <Link href="/#packages" prefetch={false} className="d-none d-sm-inline text-link">
            Packages
          </Link>
          <Link href="/blogs" prefetch={false} className="d-none d-sm-inline text-link">
            Blogs
          </Link>
          <Link href="/showcase" prefetch={false} className="d-none d-sm-inline text-link">
            Showcase
          </Link>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        <SearchBar />
        <a
          href="https://github.com/AftabIbrahimKazi/strata"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="icon-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.65-4.04-1.65-.55-1.44-1.34-1.83-1.34-1.83-1.09-.77.08-.75.08-.75 1.21.09 1.84 1.28 1.84 1.28 1.07 1.87 2.81 1.33 3.5 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.24-3.34-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.28a11.2 11.2 0 0 1 6.01 0c2.29-1.61 3.3-1.28 3.3-1.28.66 1.71.24 2.97.12 3.28.77.87 1.24 1.98 1.24 3.34 0 4.78-2.81 5.84-5.48 6.14.43.38.81 1.13.81 2.29 0 1.65-.02 2.98-.02 3.39 0 .33.22.72.83.6C20.56 22.34 24 17.73 24 12.3 24 5.5 18.63 0 12 0Z" />
          </svg>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
