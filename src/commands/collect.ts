import type { SourceCategory } from "../collectors/types.js";
import { getCollector } from "../collectors/index.js";
import { loadSources, filterSources } from "../config/sources.js";
import { summarizeSource, simpleHash } from "../summarizer/claude.js";
import { getAllPublishers, getPublisher } from "../publishers/index.js";
import { loadState, saveState, getKnownHashes, updateSourceState } from "../utils/state.js";
import type { SummarizedUpdate } from "../publishers/types.js";

export interface CollectOptions {
  source?: string[];
  category?: string;
  dryRun?: boolean;
  publish?: string;
  verbose?: boolean;
}

export async function collectCommand(options: CollectOptions): Promise<void> {
  const allSources = loadSources();
  const state = loadState();

  // Filter sources
  const sourceIds = options.source;
  const categories = options.category
    ? [options.category as SourceCategory]
    : undefined;
  const sources = filterSources(allSources, { sourceIds, categories });

  if (sources.length === 0) {
    console.log("No matching sources found.");
    return;
  }

  console.log(`\nCollecting from ${sources.length} source(s)...\n`);

  // Collect from all sources in parallel
  const allUpdates: SummarizedUpdate[] = [];

  const collectResults = await Promise.allSettled(
    sources.map(async (source) => {
      console.log(`  [${source.id}] Collecting...`);

      const results = await Promise.all(
        source.collectors.map((collectorConfig) => {
          const collector = getCollector(collectorConfig.type);
          return collector.collect(collectorConfig, source.id);
        }),
      );

      // Log errors
      for (const result of results) {
        for (const err of result.errors) {
          console.warn(`  [${source.id}] ${err}`);
        }
      }

      const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
      console.log(`  [${source.id}] Collected ${totalItems} item(s)`);

      if (options.dryRun) {
        if (options.verbose) {
          for (const result of results) {
            for (const item of result.items) {
              console.log(`    - ${item.title} (${item.date?.slice(0, 10)})`);
            }
          }
        }
        return null;
      }

      // Summarize with Claude
      const knownHashes = getKnownHashes(state, source.id);
      console.log(`  [${source.id}] Summarizing...`);
      const summarized = await summarizeSource(source, results, knownHashes);

      // Update state
      const newHashes = summarized.items.map((i) => simpleHash(`${i.title}:${i.url}`));
      const latestDate = summarized.items[0]?.date;
      updateSourceState(state, source.id, newHashes, latestDate);

      const newCount = summarized.items.filter((i) => i.isNew).length;
      console.log(`  [${source.id}] ${summarized.items.length} summary item(s), ${newCount} new`);

      return summarized;
    }),
  );

  for (const result of collectResults) {
    if (result.status === "fulfilled" && result.value) {
      allUpdates.push(result.value);
    } else if (result.status === "rejected") {
      console.error(`  [error] ${result.reason}`);
    }
  }

  if (options.dryRun) {
    console.log("\n[dry-run] Skipping publish and state save.");
    return;
  }

  if (allUpdates.length === 0) {
    console.log("\nNo updates to publish.");
    saveState(state);
    return;
  }

  // Publish
  console.log("\nPublishing...\n");

  const publisherNames = options.publish
    ? options.publish.split(",").map((s) => s.trim())
    : undefined;

  const publishers = publisherNames
    ? publisherNames.map((name) => getPublisher(name)).filter(Boolean)
    : getAllPublishers();

  await Promise.allSettled(
    publishers.map(async (publisher) => {
      if (!publisher) return;
      try {
        await publisher.publish(allUpdates, {});
      } catch (err) {
        console.error(`  [${publisher.name}] Publish failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  // Save state
  saveState(state);
  console.log("\nDone.");
}
