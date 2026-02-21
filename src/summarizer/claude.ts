import Anthropic from "@anthropic-ai/sdk";
import type { CollectorResult, SourceConfig } from "../collectors/types.js";
import type { SummarizedUpdate, SummarizedItem, ImpactLevel } from "../publishers/types.js";

const SYSTEM_PROMPT = `You are an AI technology analyst. Given raw information about AI product updates, releases, and news, produce a structured JSON summary.

Rules:
- Write summaries in Japanese (2-3 sentences each)
- Classify impact: "breaking" (API互換性なし), "major" (新モデル/大機能), "minor" (改善/小機能), "info" (お知らせ)
- Extract model names and version numbers when present
- Be concise and factual. Skip marketing language.
- If content appears to be a duplicate or irrelevant, mark impact as "info"

Output JSON array format:
[
  {
    "title": "short title",
    "date": "ISO8601",
    "summary": "Japanese summary",
    "impact": "major",
    "modelName": "GPT-5 Turbo",
    "version": "2026-02-14",
    "url": "original url"
  }
]`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function summarizeSource(
  source: SourceConfig,
  results: CollectorResult[],
  knownHashes: Set<string>,
): Promise<SummarizedUpdate> {
  const allItems = results.flatMap((r) => r.items);

  if (allItems.length === 0) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      items: [],
    };
  }

  // Build content for summarization
  const contentBlocks = allItems.map((item, i) => {
    return `--- Item ${i + 1} ---
Title: ${item.title}
URL: ${item.url}
Date: ${item.date}
Type: ${item.type}

${item.rawContent}`;
  }).join("\n\n");

  const userPrompt = `Source: ${source.name} (${source.category})

${contentBlocks}

Summarize these ${allItems.length} items as a JSON array. Focus on the most important updates.`;

  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`  [warn] No JSON found in summarizer response for ${source.id}`);
      return { sourceId: source.id, sourceName: source.name, category: source.category, items: [] };
    }

    const parsed: Array<{
      title: string;
      date: string;
      summary: string;
      impact: string;
      modelName?: string;
      version?: string;
      url: string;
    }> = JSON.parse(jsonMatch[0]);

    const items: SummarizedItem[] = parsed.map((item) => {
      const hash = simpleHash(`${item.title}:${item.url}`);
      const isNew = !knownHashes.has(hash);
      return {
        title: item.title,
        date: item.date,
        summary: item.summary,
        impact: validateImpact(item.impact),
        modelName: item.modelName,
        version: item.version,
        url: item.url,
        isNew,
      };
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      items,
    };
  } catch (err) {
    console.error(`  [error] Summarization failed for ${source.id}: ${err instanceof Error ? err.message : String(err)}`);
    return { sourceId: source.id, sourceName: source.name, category: source.category, items: [] };
  }
}

function validateImpact(value: string): ImpactLevel {
  const valid: ImpactLevel[] = ["breaking", "major", "minor", "info"];
  return valid.includes(value as ImpactLevel) ? (value as ImpactLevel) : "info";
}

export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
