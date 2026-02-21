#!/usr/bin/env bun
import { Command } from "commander";
import { config } from "dotenv";
import { collectCommand } from "./commands/collect.js";
import { sourcesCommand } from "./commands/sources.js";
import { publishCommand } from "./commands/publish.js";
import { reportCommand } from "./commands/report.js";

config();

const program = new Command();

program
  .name("ai-watch")
  .description("Monitor AI API updates, local LLM managers, and open source models")
  .version("0.1.0");

program
  .command("collect")
  .description("Collect latest updates from all configured sources")
  .option("-s, --source <id...>", "Collect from specific source(s) only")
  .option("-c, --category <category>", "Filter by category (commercial, local-llm, oss-models)")
  .option("--dry-run", "Collect without summarizing or publishing")
  .option("-p, --publish <targets>", "Publish to specific targets (comma-separated: local,claude-md,discord,slack)")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    await collectCommand(options);
  });

program
  .command("sources")
  .description("List configured sources and their status")
  .option("-t, --test <id>", "Test a single source by fetching its feeds")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    await sourcesCommand(options);
  });

program
  .command("publish")
  .description("Publish latest collected data to a target")
  .option("-t, --target <name>", "Target publisher (local, claude-md, discord, slack, google-drive)")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    await publishCommand(options);
  });

program
  .command("report")
  .description("Display the latest collected report")
  .option("-f, --format <format>", "Output format: markdown (default) or compact", "markdown")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    await reportCommand(options);
  });

program.parse();
