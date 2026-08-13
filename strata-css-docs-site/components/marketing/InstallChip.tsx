"use client";

import { useState } from "react";

export default function InstallChip({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-outline-secondary d-flex align-items-center gap-2 font-monospace"
    >
      <span aria-hidden="true">&gt;_</span>
      {command}
      <span className="text-muted">{copied ? "Copied" : ""}</span>
    </button>
  );
}
