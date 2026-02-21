import type { Collector, CollectorConfig, CollectorResult, CollectedItem } from "./types.js";

interface HFModel {
  id: string;
  modelId: string;
  author: string;
  lastModified: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
  tags?: string[];
}

export const huggingfaceCollector: Collector = {
  type: "huggingface",

  async collect(config: CollectorConfig, sourceId: string): Promise<CollectorResult> {
    const errors: string[] = [];
    const items: CollectedItem[] = [];

    try {
      const headers: Record<string, string> = {
        "User-Agent": "ai-watch/0.1.0",
      };

      const token = process.env.HF_TOKEN;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let url: string;

      if (config.endpoint === "trending") {
        // Trending models: sort by likes in recent period
        url = "https://huggingface.co/api/models?sort=likes7d&direction=-1&limit=20";
      } else if (config.author) {
        // Models by specific author
        const search = config.model_prefix
          ? `&search=${encodeURIComponent(config.model_prefix)}`
          : "";
        url = `https://huggingface.co/api/models?author=${config.author}${search}&sort=lastModified&direction=-1&limit=10`;
      } else {
        return { sourceId, items, collectedAt: new Date().toISOString(), errors: ["HuggingFace config incomplete"] };
      }

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });

      if (!res.ok) {
        throw new Error(`HuggingFace API returned ${res.status}: ${res.statusText}`);
      }

      const models = (await res.json()) as HFModel[];

      for (const model of models) {
        const title = model.modelId || model.id;
        const rawContent = [
          `Model: ${title}`,
          `Author: ${model.author}`,
          model.pipeline_tag ? `Task: ${model.pipeline_tag}` : "",
          `Downloads: ${model.downloads.toLocaleString()}`,
          `Likes: ${model.likes.toLocaleString()}`,
          model.tags?.length ? `Tags: ${model.tags.slice(0, 10).join(", ")}` : "",
        ].filter(Boolean).join("\n");

        items.push({
          title,
          url: `https://huggingface.co/${model.modelId || model.id}`,
          date: model.lastModified || new Date().toISOString(),
          rawContent,
          type: "model",
        });
      }
    } catch (err) {
      errors.push(`HuggingFace fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { sourceId, items, collectedAt: new Date().toISOString(), errors };
  },
};
