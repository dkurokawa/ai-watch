import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface SourceState {
  lastCollected: string;
  knownItemHashes: string[];
  lastItemDate?: string;
  lastReleaseTag?: string;
}

export interface WatchState {
  lastRun: string;
  sources: Record<string, SourceState>;
}

const STATE_FILE = join(import.meta.dirname, "../../.ai-watch-state.json");

export function loadState(): WatchState {
  if (!existsSync(STATE_FILE)) {
    return { lastRun: "", sources: {} };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { lastRun: "", sources: {} };
  }
}

export function saveState(state: WatchState): void {
  state.lastRun = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function getKnownHashes(state: WatchState, sourceId: string): Set<string> {
  return new Set(state.sources[sourceId]?.knownItemHashes || []);
}

export function updateSourceState(
  state: WatchState,
  sourceId: string,
  newHashes: string[],
  lastItemDate?: string,
): void {
  const existing = state.sources[sourceId] || { lastCollected: "", knownItemHashes: [] };
  const allHashes = new Set([...existing.knownItemHashes, ...newHashes]);

  // Keep only last 200 hashes per source to prevent unbounded growth
  const trimmed = [...allHashes].slice(-200);

  state.sources[sourceId] = {
    lastCollected: new Date().toISOString(),
    knownItemHashes: trimmed,
    lastItemDate: lastItemDate || existing.lastItemDate,
  };
}
