import type { SourceCategory } from "../collectors/types.js";

export type ImpactLevel = "breaking" | "major" | "minor" | "info";

export interface SummarizedItem {
  title: string;
  date: string;
  summary: string;
  impact: ImpactLevel;
  modelName?: string;
  version?: string;
  url: string;
  isNew: boolean;
}

export interface SummarizedUpdate {
  sourceId: string;
  sourceName: string;
  category: SourceCategory;
  items: SummarizedItem[];
}

export interface PublishConfig {
  outputDir?: string;
  claudeMdPath?: string;
  driveFolderId?: string;
  driveCredentialsDir?: string;
}

export interface Publisher {
  name: string;
  publish(updates: SummarizedUpdate[], config: PublishConfig): Promise<void>;
}
