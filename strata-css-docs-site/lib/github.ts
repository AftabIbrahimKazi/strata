const REVALIDATE_SECONDS = 3600;

export async function getRepoStars(owner: string, repo: string): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json.stargazers_count === "number" ? json.stargazers_count : null;
}
