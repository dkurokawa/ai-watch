export type SourceCategory = "commercial" | "local-llm" | "oss-models";
export type CollectorType = "rss" | "github-releases" | "web-scrape" | "huggingface";
export type ItemType = "release" | "blog" | "changelog" | "model";

export interface CollectorConfig {
  type: CollectorType;
  url?: string;
  repo?: string;
  selector?: string;
  endpoint?: string;
  author?: string;
  model_prefix?: string;
  note?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  category: SourceCategory;
  collectors: CollectorConfig[];
}

export interface CollectedItem {
  title: string;
  url: string;
  date: string;
  rawContent: string;
  type: ItemType;
}

export interface CollectorResult {
  sourceId: string;
  items: CollectedItem[];
  collectedAt: string;
  errors: string[];
}

export interface Collector {
  type: CollectorType;
  collect(config: CollectorConfig, sourceId: string): Promise<CollectorResult>;
}
