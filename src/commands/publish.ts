import { readFileSync, existsSync } from "node:fs";
import { getPublisher, getAllPublishers, getPublisherNames } from "../publishers/index.js";
import { projectPath } from "../utils/paths.js";

export interface PublishOptions {
  target?: string;
  verbose?: boolean;
}

export async function publishCommand(options: PublishOptions): Promise<void> {
  // Load the latest report data
  const latestPath = projectPath("reports", "ai-watch-latest.json");

  if (!existsSync(latestPath)) {
    console.error("No collected data found. Run 'ai-watch collect' first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(latestPath, "utf-8"));

  const publishers = options.target
    ? [getPublisher(options.target)].filter(Boolean)
    : getAllPublishers();

  if (publishers.length === 0) {
    console.error(`Unknown target: ${options.target}`);
    console.log(`Available: ${getPublisherNames().join(", ")}`);
    process.exit(1);
  }

  console.log(`\nPublishing to ${publishers.length} target(s)...\n`);

  for (const publisher of publishers) {
    if (!publisher) continue;
    try {
      await publisher.publish(data.updates, {});
    } catch (err) {
      console.error(`  [${publisher.name}] Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\nDone.");
}
