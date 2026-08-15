"use client";

import { useState } from "react";

type Bump = { label: string; prefix: string; variant: "primary" | "secondary" | "danger" };

const BUMPS: Bump[] = [
  { label: "feat:", prefix: "feat:", variant: "primary" },
  { label: "fix:", prefix: "fix:", variant: "secondary" },
  { label: "BREAKING:", prefix: "BREAKING:", variant: "danger" },
];

const BTN_CLASS: Record<Bump["variant"], string> = {
  primary: "btn-primary btn-sm",
  secondary: "btn-outline-secondary btn-sm",
  danger: "btn-outline-danger btn-sm",
};

export default function VersionBumpDemo() {
  const [version, setVersion] = useState({ major: 1, feature: 0, bugfix: 0 });
  const [log, setLog] = useState<string[]>([]);

  function apply(prefix: string) {
    setVersion((v) => {
      if (prefix === "BREAKING:") return { major: v.major + 1, feature: 0, bugfix: 0 };
      if (prefix === "feat:") return { ...v, feature: v.feature + 1 };
      return { ...v, bugfix: v.bugfix + 1 };
    });
    setLog((l) => [prefix, ...l].slice(0, 6));
  }

  function reset() {
    setVersion({ major: 1, feature: 0, bugfix: 0 });
    setLog([]);
  }

  return (
    <div className="border rounded p-3 mb-4">
      <div className="d-flex align-items-center justify-content-center p-4 mb-3 bg-[var(--st-bg-secondary)] rounded">
        <code className="fs-[1.75rem] fw-bold">
          {version.major}.{version.feature}.{version.bugfix}
        </code>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        {BUMPS.map((b) => (
          <button
            key={b.prefix}
            type="button"
            onClick={() => apply(b.prefix)}
            className={BTN_CLASS[b.variant]}
          >
            {b.label} commit
          </button>
        ))}
        <button type="button" onClick={reset} className="btn-outline-secondary btn-sm ms-auto">
          Reset
        </button>
      </div>
      {log.length > 0 && (
        <p className="mt-3 mb-0 text-muted fs-[0.875rem]">
          Last commits (newest first): {log.join(", ")}
        </p>
      )}
    </div>
  );
}
