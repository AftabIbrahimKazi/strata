"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docNav } from "@/lib/docNav";

export default function DocsPrevNext() {
  const pathname = usePathname();
  const index = docNav.findIndex((entry) => entry.href === pathname);
  if (index === -1) return null;

  const prev = index > 0 ? docNav[index - 1] : null;
  const next = index < docNav.length - 1 ? docNav[index + 1] : null;
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Docs navigation"
      className="d-flex justify-content-between gap-3 mt-5 pt-4 border-top"
    >
      {prev ? (
        <Link href={prev.href} className="text-link d-block">
          <span className="d-block text-muted">Previous</span>
          <span className="fw-semibold">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="text-link d-block text-end">
          <span className="d-block text-muted">Next</span>
          <span className="fw-semibold">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
