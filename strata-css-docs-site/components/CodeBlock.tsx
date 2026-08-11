"use client";

import { useState } from "react";

export default function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="position-relative rounded border overflow-hidden">
      <button
        type="button"
        onClick={handleCopy}
        className="btn-outline-secondary btn-sm position-absolute top-0 end-0 m-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="p-3 mb-0 overflow-x-auto bg-[var(--st-bg-secondary)]">
        <code data-lang={lang}>{code}</code>
      </pre>
    </div>
  );
}
