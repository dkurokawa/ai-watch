import { readFileSync } from "node:fs";
import YAML from "js-yaml";
import type { SourceConfig, SourceCategory } from "../collectors/types.js";
import { projectPath } from "../utils/paths.js";

interface SourcesYaml {
  sources: SourceConfig[];
}

let cachedSources: SourceConfig[] | null = null;

export function loadSources(): SourceConfig[] {
  if (cachedSources) return cachedSources;

  const configPath = projectPath("config", "sources.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = YAML.load(raw) as SourcesYaml;

  if (!parsed?.sources || !Array.isArray(parsed.sources)) {
    throw new Error("Invalid sources.yaml: missing 'sources' array");
  }

  cachedSources = parsed.sources;
  return cachedSources;
}

export function filterSources(
  sources: SourceConfig[],
  options: { sourceIds?: string[]; categories?: SourceCategory[] },
): SourceConfig[] {
  let filtered = sources;

  if (options.sourceIds?.length) {
    filtered = filtered.filter((s) => options.sourceIds!.includes(s.id));
  }

  if (options.categories?.length) {
    filtered = filtered.filter((s) => options.categories!.includes(s.category));
  }

  return filtered;
}
