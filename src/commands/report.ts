import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatUpdatesAsMarkdown, formatUpdatesCompact } from "../publishers/format.js";

export interface ReportOptions {
  format?: string;
  verbose?: boolean;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  const latestPath = join(import.meta.dirname, "../../reports/ai-watch-latest.json");

  if (!existsSync(latestPath)) {
    console.error("No collected data found. Run 'ai-watch collect' first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(latestPath, "utf-8"));

  if (options.format === "compact") {
    console.log(formatUpdatesCompact(data.updates));
  } else {
    console.log(formatUpdatesAsMarkdown(data.updates));
  }
}
