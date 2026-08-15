"use client";

import { useState } from "react";

export default function Playground({
  classes,
  previewLabel = "Preview",
  multi = true,
  bare = false,
}: {
  classes: string[];
  previewLabel?: string;
  multi?: boolean;
  /** Omit the preview box's own border/rounded chrome — for pages (Borders, Shadows)
   *  demonstrating those exact properties, where a baked-in border/radius would
   *  compete with the toggled class instead of clearly showing its effect. */
  bare?: boolean;
}) {
  const [active, setActive] = useState<string[]>([classes[0]]);

  function toggle(cls: string) {
    if (multi) {
      setActive((prev) =>
        prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
      );
    } else {
      setActive([cls]);
    }
  }

  const chrome = bare ? "" : "border rounded ";

  return (
    <div className="border rounded p-3 mb-4">
      <div
        className={`d-flex align-items-center justify-content-center ${chrome}p-4 mb-3 bg-[var(--st-bg-secondary)] ${active.join(" ")}`}
      >
        <span className="badge-primary">{previewLabel}</span>
      </div>
      <div className="d-flex flex-wrap gap-2">
        {classes.map((cls) => (
          <button
            key={cls}
            type="button"
            onClick={() => toggle(cls)}
            className={active.includes(cls) ? "btn-primary btn-sm" : "btn-outline-secondary btn-sm"}
          >
            {cls}
          </button>
        ))}
      </div>
    </div>
  );
}
