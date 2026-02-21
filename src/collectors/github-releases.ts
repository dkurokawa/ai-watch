import type { Collector, CollectorConfig, CollectorResult, CollectedItem } from "./types.js";

interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
}

export const githubReleasesCollector: Collector = {
  type: "github-releases",

  async collect(config: CollectorConfig, sourceId: string): Promise<CollectorResult> {
    const errors: string[] = [];
    const items: CollectedItem[] = [];

    if (!config.repo) {
      return { sourceId, items, collectedAt: new Date().toISOString(), errors: ["GitHub repo not configured"] };
    }

    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "ai-watch/0.1.0",
      };

      const token = process.env.GITHUB_TOKEN;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${config.repo}/releases?per_page=10`,
        { headers },
      );

      if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}: ${res.statusText}`);
      }

      const releases = (await res.json()) as GitHubRelease[];

      for (const release of releases) {
        if (release.draft) continue;

        const title = release.name || release.tag_name;
        const rawContent = [
          `${title} (${release.tag_name})`,
          release.prerelease ? "[Pre-release]" : "",
          release.body || "",
        ].filter(Boolean).join("\n\n").trim();

        // Truncate very long release notes
        const truncated = rawContent.length > 3000
          ? rawContent.slice(0, 3000) + "\n\n... (truncated)"
          : rawContent;

        items.push({
          title,
          url: release.html_url,
          date: release.published_at,
          rawContent: truncated,
          type: "release",
        });
      }
    } catch (err) {
      errors.push(`GitHub releases fetch failed for ${config.repo}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { sourceId, items, collectedAt: new Date().toISOString(), errors };
  },
};
