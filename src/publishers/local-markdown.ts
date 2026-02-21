import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Publisher, SummarizedUpdate, PublishConfig } from "./types.js";
import { formatUpdatesAsMarkdown } from "./format.js";

export const localMarkdownPublisher: Publisher = {
  name: "local",

  async publish(updates: SummarizedUpdate[], config: PublishConfig): Promise<void> {
    const outputDir = config.outputDir || join(import.meta.dirname, "../../reports");
    mkdirSync(outputDir, { recursive: true });

    const markdown = formatUpdatesAsMarkdown(updates);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const dated = join(outputDir, `ai-watch-${dateStr}.md`);
    const latest = join(outputDir, "ai-watch-latest.md");

    writeFileSync(dated, markdown, "utf-8");
    writeFileSync(latest, markdown, "utf-8");

    console.log(`  [local] Written to ${dated}`);
    console.log(`  [local] Updated ${latest}`);
  },
};
