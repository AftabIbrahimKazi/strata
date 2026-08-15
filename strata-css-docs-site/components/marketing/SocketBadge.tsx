"use client";

import { useState } from "react";

// Socket's public badge endpoint is a real, unauthenticated, live-updating
// SVG (not blocked by Cloudflare like their JSON API — badges are meant for
// public embedding). It 403s for packages Socket hasn't indexed, so this
// just hides itself on error rather than showing a broken image.
export default function SocketBadge({ npmName }: { npmName: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://socket.dev/api/badge/npm/package/${npmName}`}
      alt={`${npmName} Socket score`}
      height={20}
      onError={() => setFailed(true)}
    />
  );
}
