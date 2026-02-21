import type { Publisher, SummarizedUpdate, PublishConfig } from "./types.js";

export const slackPublisher: Publisher = {
  name: "slack",

  async publish(updates: SummarizedUpdate[]): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log("  [slack] SLACK_WEBHOOK_URL not set, skipping");
      return;
    }

    // Only notify about new items with major+ impact
    const significant = updates.filter((u) =>
      u.items.some((i) => i.isNew && (i.impact === "breaking" || i.impact === "major")),
    );

    if (significant.length === 0) {
      console.log("  [slack] No significant new updates to notify");
      return;
    }

    const blocks: Array<Record<string, unknown>> = [
      {
        type: "header",
        text: { type: "plain_text", text: "AI Watch: New Updates" },
      },
    ];

    for (const update of significant.slice(0, 10)) {
      const newMajor = update.items
        .filter((i) => i.isNew && (i.impact === "breaking" || i.impact === "major"));

      const text = newMajor
        .map((i) => `*[${i.impact.toUpperCase()}]* ${i.title}\n${i.summary}\n<${i.url}|Link>`)
        .join("\n\n");

      blocks.push(
        { type: "divider" },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${update.sourceName}* (${update.category})\n\n${text}` },
        },
      );
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      console.log(`  [slack] Sent notification`);
    } catch {
      console.warn("  [slack] Failed to send notification");
    }
  },
};
