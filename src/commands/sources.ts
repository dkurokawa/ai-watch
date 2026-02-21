import { loadSources } from "../config/sources.js";
import { loadState } from "../utils/state.js";
import { getCollector } from "../collectors/index.js";

export interface SourcesOptions {
  test?: string;
  verbose?: boolean;
}

export async function sourcesCommand(options: SourcesOptions): Promise<void> {
  const sources = loadSources();
  const state = loadState();

  if (options.test) {
    // Test a single source
    const source = sources.find((s) => s.id === options.test);
    if (!source) {
      console.error(`Source not found: ${options.test}`);
      console.log(`Available: ${sources.map((s) => s.id).join(", ")}`);
      process.exit(1);
    }

    console.log(`\nTesting source: ${source.name} (${source.id})\n`);

    for (const collectorConfig of source.collectors) {
      console.log(`  Collector: ${collectorConfig.type}`);
      if (collectorConfig.url) console.log(`  URL: ${collectorConfig.url}`);
      if (collectorConfig.repo) console.log(`  Repo: ${collectorConfig.repo}`);

      const collector = getCollector(collectorConfig.type);
      const result = await collector.collect(collectorConfig, source.id);

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          console.error(`  Error: ${err}`);
        }
      }

      console.log(`  Items: ${result.items.length}`);
      for (const item of result.items.slice(0, 5)) {
        console.log(`    - ${item.title} (${item.date?.slice(0, 10) || "no date"})`);
        if (options.verbose && item.rawContent) {
          console.log(`      ${item.rawContent.slice(0, 200)}...`);
        }
      }
      if (result.items.length > 5) {
        console.log(`    ... and ${result.items.length - 5} more`);
      }
      console.log();
    }
    return;
  }

  // List all sources
  console.log(`\nConfigured Sources (${sources.length}):\n`);

  const categories = new Map<string, typeof sources>();
  for (const source of sources) {
    const list = categories.get(source.category) || [];
    list.push(source);
    categories.set(source.category, list);
  }

  const categoryLabels: Record<string, string> = {
    commercial: "Commercial AI APIs",
    "local-llm": "Local LLM Managers",
    "oss-models": "Open Source Models",
  };

  for (const [category, categorySources] of categories) {
    console.log(`  ${categoryLabels[category] || category}`);
    console.log(`  ${"─".repeat(40)}`);

    for (const source of categorySources) {
      const sourceState = state.sources[source.id];
      const lastRun = sourceState?.lastCollected
        ? new Date(sourceState.lastCollected).toISOString().slice(0, 16).replace("T", " ")
        : "never";
      const collectorTypes = source.collectors.map((c) => c.type).join(", ");

      console.log(`  ${source.id.padEnd(22)} ${collectorTypes.padEnd(25)} last: ${lastRun}`);
    }
    console.log();
  }
}
