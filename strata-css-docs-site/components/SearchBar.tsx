"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { docNav } from "@/lib/docNav";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return docNav
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.description?.toLowerCase().includes(q) ||
          entry.href.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goTo(results[activeIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="d-none d-md-flex max-w-[420px] position-relative" ref={containerRef}>
      <input
        type="search"
        placeholder="Search documentation..."
        aria-label="Search documentation"
        className="form-control search-input pe-[2rem]"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          className="search-clear-btn position-absolute border-0 bg-transparent d-flex align-items-center justify-content-center"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="list-unstyled position-absolute bg-body-secondary border rounded shadow-lg w-[320px] p-1 overflow-y-auto max-h-[360px]"
          style={{ top: "calc(100% + 4px)", left: 0, zIndex: 1050 }}
        >
          {results.map((entry, i) => (
            <li key={entry.href}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className="d-block w-100 text-start p-2 rounded border-0 bg-transparent search-result-item"
                data-active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => goTo(entry.href)}
              >
                <span className="d-block fw-semibold">{entry.title}</span>
                <span className="d-block text-muted">{entry.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
