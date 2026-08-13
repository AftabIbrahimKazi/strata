const REVALIDATE_SECONDS = 3600;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function pointDownloads(pkg: string, start: Date, end: Date): Promise<number> {
  const url = `https://api.npmjs.org/downloads/point/${isoDate(start)}:${isoDate(end)}/${encodeURIComponent(pkg)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return 0;
  const json = await res.json();
  return typeof json.downloads === "number" ? json.downloads : 0;
}

export async function getWeeklyDownloads(pkg: string): Promise<{ count: number; deltaPct: number | null }> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
  const dayBeforeWeekAgo = new Date(weekAgo);
  dayBeforeWeekAgo.setUTCDate(dayBeforeWeekAgo.getUTCDate() - 1);

  const [current, previous] = await Promise.all([
    pointDownloads(pkg, weekAgo, now),
    pointDownloads(pkg, twoWeeksAgo, dayBeforeWeekAgo),
  ]);

  const deltaPct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return { count: current, deltaPct };
}

export async function getLatestVersionInfo(
  pkg: string
): Promise<{ version: string; daysAgo: number } | null> {
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
  return { version, daysAgo };
}
