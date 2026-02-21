import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Publisher, SummarizedUpdate, PublishConfig } from "./types.js";
import { formatUpdatesAsMarkdown } from "./format.js";

export const claudeMdPublisher: Publisher = {
  name: "claude-md",

  async publish(updates: SummarizedUpdate[], config: PublishConfig): Promise<void> {
    const mdPath = config.claudeMdPath || join(homedir(), ".claude", "AI_LATEST.md");
    const markdown = formatUpdatesAsMarkdown(updates);

    writeFileSync(mdPath, markdown, "utf-8");
    console.log(`  [claude-md] Updated ${mdPath}`);
  },
};
