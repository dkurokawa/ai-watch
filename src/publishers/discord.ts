import type { Publisher, SummarizedUpdate, PublishConfig } from "./types.js";

const CATEGORY_COLORS: Record<string, number> = {
  commercial: 0x3498db,
  "local-llm": 0x2ecc71,
  "oss-models": 0x9b59b6,
};

const MAX_DESCRIPTION = 3900;

export const discordPublisher: Publisher = {
  name: "discord",

  async publish(updates: SummarizedUpdate[]): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log("  [discord] DISCORD_WEBHOOK_URL not set, skipping");
      return;
    }

    // Only notify about new items with major+ impact
    const significant = updates.filter((u) =>
      u.items.some((i) => i.isNew && (i.impact === "breaking" || i.impact === "major")),
    );

    if (significant.length === 0) {
      console.log("  [discord] No significant new updates to notify");
      return;
    }

    const embeds = significant.slice(0, 10).map((update) => {
      const newMajor = update.items
        .filter((i) => i.isNew && (i.impact === "breaking" || i.impact === "major"));

      let description = newMajor
        .map((i) => `**[${i.impact.toUpperCase()}]** ${i.title}\n${i.summary}`)
        .join("\n\n");

      if (description.length > MAX_DESCRIPTION) {
        description = description.slice(0, MAX_DESCRIPTION) + "\n\n... (truncated)";
      }

      return {
        title: `${update.sourceName} (${update.category})`,
        description,
        color: CATEGORY_COLORS[update.category] || 0x95a5a6,
        timestamp: new Date().toISOString(),
        footer: { text: "ai-watch" },
      };
    });

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds }),
      });
      console.log(`  [discord] Sent ${embeds.length} notification(s)`);
    } catch {
      // Silent fail — notifications are best-effort
      console.warn("  [discord] Failed to send notification");
    }
  },
};
