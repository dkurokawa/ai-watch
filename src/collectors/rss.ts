import RSSParser from "rss-parser";
import type { Collector, CollectorConfig, CollectorResult, CollectedItem } from "./types.js";

const parser = new RSSParser({
  timeout: 15_000,
  headers: {
    "User-Agent": "ai-watch/0.1.0",
  },
});

export const rssCollector: Collector = {
  type: "rss",

  async collect(config: CollectorConfig, sourceId: string): Promise<CollectorResult> {
    const errors: string[] = [];
    const items: CollectedItem[] = [];

    if (!config.url) {
      return { sourceId, items, collectedAt: new Date().toISOString(), errors: ["RSS URL not configured"] };
    }

    try {
      const feed = await parser.parseURL(config.url);

      for (const entry of feed.items.slice(0, 20)) {
        const title = entry.title?.trim() || "Untitled";
        const url = entry.link || config.url;
        const date = entry.isoDate || entry.pubDate || new Date().toISOString();
        const rawContent = [
          title,
          entry.contentSnippet || entry.content || entry.summary || "",
        ].join("\n\n").trim();

        items.push({ title, url, date, rawContent, type: "blog" });
      }
    } catch (err) {
      errors.push(`RSS fetch failed for ${config.url}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { sourceId, items, collectedAt: new Date().toISOString(), errors };
  },
};
