import * as cheerio from "cheerio";
import type { Collector, CollectorConfig, CollectorResult, CollectedItem } from "./types.js";

export const webScrapeCollector: Collector = {
  type: "web-scrape",

  async collect(config: CollectorConfig, sourceId: string): Promise<CollectorResult> {
    const errors: string[] = [];
    const items: CollectedItem[] = [];

    if (!config.url) {
      return { sourceId, items, collectedAt: new Date().toISOString(), errors: ["Scrape URL not configured"] };
    }

    try {
      const res = await fetch(config.url, {
        headers: {
          "User-Agent": "ai-watch/0.1.0 (AI changelog monitor)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // If a CSS selector is provided, extract matching elements
      if (config.selector) {
        $(config.selector).each((_i, el) => {
          const $el = $(el);
          const title = $el.find("h1, h2, h3, h4, [class*='title']").first().text().trim()
            || $el.text().trim().slice(0, 100);
          const text = $el.text().trim();
          const link = $el.find("a").first().attr("href") || config.url!;
          const fullUrl = link.startsWith("http") ? link : new URL(link, config.url).href;

          if (text.length > 10) {
            items.push({
              title: title || "Update",
              url: fullUrl,
              date: new Date().toISOString(),
              rawContent: text.slice(0, 2000),
              type: "changelog",
            });
          }
        });
      } else {
        // Fallback: extract the main content as a single item
        const bodyText = $("main, article, [role='main'], .content, #content, body")
          .first().text().trim();

        if (bodyText.length > 50) {
          const title = $("title").text().trim() || $("h1").first().text().trim() || "Page Content";
          items.push({
            title,
            url: config.url,
            date: new Date().toISOString(),
            rawContent: bodyText.slice(0, 5000),
            type: "changelog",
          });
        }
      }
    } catch (err) {
      errors.push(`Web scrape failed for ${config.url}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { sourceId, items, collectedAt: new Date().toISOString(), errors };
  },
};
