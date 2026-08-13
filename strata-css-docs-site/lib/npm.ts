const REVALIDATE_SECONDS = 3600;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Cumulative all-time downloads. Deliberately not a period-over-period
// metric (e.g. "this week vs last week") — a running total can only ever
// go up, so it can never render an unflattering dip on a marketing page.
// npm's API clamps the start date to the package's actual registration
// date, so an old fixed start date safely covers "all time".
export async function getTotalDownloads(pkg: string): Promise<number> {
  const start = new Date("2015-01-01");
  const end = new Date();
  const url = `https://api.npmjs.org/downloads/point/${isoDate(start)}:${isoDate(end)}/${encodeURIComponent(pkg)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return 0;
  const json = await res.json();
  return typeof json.downloads === "number" ? json.downloads : 0;
}

export async function getLatestVersionInfo(
  pkg: string
): Promise<{ version: string; daysAgo: number; versionCount: number } | null> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
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
