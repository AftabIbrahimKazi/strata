"use client";

import { useState, type ReactNode } from "react";

export default function AttributeDemo({
  attr,
  values,
  initial,
  content,
}: {
  attr: string;
  values: string[];
  initial: string;
  content: Record<string, ReactNode>;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="border rounded p-3 mb-4">
      <div className="d-flex align-items-center justify-content-center p-4 mb-3 bg-[var(--st-bg-secondary)] rounded overflow-hidden min-h-[96px]">
        {content[value]}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <code className="text-nowrap">
          {attr}=&quot;{value}&quot;
        </code>
        <div className="d-flex gap-2 ms-auto">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValue(v)}
              className={v === value ? "btn-primary btn-sm" : "btn-outline-secondary btn-sm"}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
