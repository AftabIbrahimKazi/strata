const REVALIDATE_SECONDS = 3600;

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
