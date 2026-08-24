// No `next: { revalidate }` here on purpose: that opted the homepage into
// ISR, which regenerates it in a serverless function on a timer. That
// function's filesystem never has CHANGELOG.md/ROADMAP.md (Vercel only ships
// what Next's build tracer can prove a route needs from static imports —
// see next.config.ts's outputFileTracingIncludes comment), so every
// regeneration silently dropped the What's New / Roadmap sections. Plain
// fetch defaults to force-cache, so this now runs once at build time only —
// the version badge goes stale between deploys, but the page can no longer
// be regenerated server-side at all, which removes this failure mode rather
// than patching around it again.
export async function getLatestVersionInfo(
  pkg: string
): Promise<{ version: string; daysAgo: number; versionCount: number } | null> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
  if (!res.ok) return null;
  const json = await res.json();
  const version: string | undefined = json?.["dist-tags"]?.latest;
  if (!version) return null;
  const publishedAt: string | undefined = json?.time?.[version];
  const daysAgo = publishedAt
    ? Math.max(0, Math.round((Date.now() - new Date(publishedAt).getTime()) / 86_400_000))
    : 0;
  const versionCount = json?.versions ? Object.keys(json.versions).length : 1;
  return { version, daysAgo, versionCount };
}
