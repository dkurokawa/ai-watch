import type { Collector, CollectorType } from "./types.js";
import { rssCollector } from "./rss.js";
import { githubReleasesCollector } from "./github-releases.js";
import { webScrapeCollector } from "./web-scrape.js";
import { huggingfaceCollector } from "./huggingface.js";

const collectors: Record<CollectorType, Collector> = {
  rss: rssCollector,
  "github-releases": githubReleasesCollector,
  "web-scrape": webScrapeCollector,
  huggingface: huggingfaceCollector,
};

export function getCollector(type: CollectorType): Collector {
  const collector = collectors[type];
  if (!collector) {
    throw new Error(`Unknown collector type: ${type}`);
  }
  return collector;
}

export { type Collector, type CollectorResult, type CollectedItem, type SourceConfig } from "./types.js";
