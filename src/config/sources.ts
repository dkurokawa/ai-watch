import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "js-yaml";
import type { SourceConfig, SourceCategory } from "../collectors/types.js";

const CONFIG_PATH = join(import.meta.dirname, "../../config/sources.yaml");

interface SourcesYaml {
  sources: SourceConfig[];
}

let cachedSources: SourceConfig[] | null = null;

export function loadSources(): SourceConfig[] {
  if (cachedSources) return cachedSources;

  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Sources config not found: ${CONFIG_PATH}`);
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
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
