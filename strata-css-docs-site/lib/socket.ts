import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Socket's badge endpoint is Cloudflare-protected and fingerprints the
// HTTP client, not just its headers: plain curl with a browser-like
// User-Agent passes reliably, but Node's own fetch (undici) gets 403'd
// with the identical headers every time — confirmed by testing both
// directly against the same endpoint. Shelling out to curl is the only
// path from a Node build/server context that actually gets the real
// score back; the SVG's aria-label ("Socket: 80") is the only numeric
// value Socket exposes publicly — the 5-metric breakdown on socket.dev
// itself needs a paid API key.
export async function getSocketScore(pkg: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-s",
      "-H",
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "-H",
      "Accept: image/svg+xml,image/*,*/*;q=0.8",
      `https://socket.dev/api/badge/npm/package/${encodeURIComponent(pkg)}`,
    ]);
    const match = stdout.match(/aria-label="Socket:\s*(\d+)"/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}
