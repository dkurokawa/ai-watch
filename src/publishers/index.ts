import type { Publisher } from "./types.js";
import { localMarkdownPublisher } from "./local-markdown.js";
import { claudeMdPublisher } from "./claude-md.js";
import { discordPublisher } from "./discord.js";
import { slackPublisher } from "./slack.js";
import { googleDrivePublisher } from "./google-drive.js";

const publishers: Record<string, Publisher> = {
  local: localMarkdownPublisher,
  "claude-md": claudeMdPublisher,
  discord: discordPublisher,
  slack: slackPublisher,
  "google-drive": googleDrivePublisher,
};

export function getPublisher(name: string): Publisher | undefined {
  return publishers[name];
}

export function getAllPublishers(): Publisher[] {
  return Object.values(publishers);
}

export function getPublisherNames(): string[] {
  return Object.keys(publishers);
}

export { type Publisher, type SummarizedUpdate, type PublishConfig } from "./types.js";
