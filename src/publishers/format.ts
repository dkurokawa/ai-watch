import type { SummarizedUpdate, SummarizedItem } from "./types.js";

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "Commercial AI APIs",
  "local-llm": "Local LLM Managers",
  "oss-models": "Open Source Models",
};

const IMPACT_LABELS: Record<string, string> = {
  breaking: "BREAKING",
  major: "MAJOR",
  minor: "MINOR",
  info: "INFO",
};

export function formatUpdatesAsMarkdown(updates: SummarizedUpdate[]): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const timestamp = `${jst.toISOString().slice(0, 10)} ${jst.toISOString().slice(11, 16)} JST`;

  const lines: string[] = [
    "# AI Latest Updates",
    `> Last updated: ${timestamp}`,
    "",
  ];

  // Group by category
  const byCategory = new Map<string, SummarizedUpdate[]>();
  for (const update of updates) {
    const existing = byCategory.get(update.category) || [];
    existing.push(update);
    byCategory.set(update.category, existing);
  }

  for (const category of ["commercial", "local-llm", "oss-models"]) {
    const sources = byCategory.get(category);
    if (!sources?.length) continue;

    const label = CATEGORY_LABELS[category] || category;
    lines.push(`## ${label}`, "");

    for (const source of sources) {
      if (source.items.length === 0) continue;

      lines.push(`### ${source.sourceName}`, "");

      for (const item of source.items) {
        const impactTag = `**[${IMPACT_LABELS[item.impact] || "INFO"}]**`;
        const dateStr = item.date ? ` (${item.date.slice(0, 10)})` : "";
        const newTag = item.isNew ? " 🆕" : "";

        lines.push(`- ${impactTag} ${item.title}${dateStr}${newTag}`);
        if (item.summary) {
          lines.push(`  ${item.summary}`);
        }
        if (item.url) {
          lines.push(`  ${item.url}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

export function formatUpdatesCompact(updates: SummarizedUpdate[]): string {
  const newItems = updates
    .flatMap((u) => u.items.filter((i) => i.isNew))
    .sort((a, b) => {
      const impactOrder = { breaking: 0, major: 1, minor: 2, info: 3 };
      return (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3);
    });

  if (newItems.length === 0) return "No new updates.";

  return newItems
    .map((i) => `[${i.impact.toUpperCase()}] ${i.title}: ${i.summary}`)
    .join("\n");
}
