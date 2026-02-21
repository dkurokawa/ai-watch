import { describe, it, expect, vi } from "vitest";
import { formatUpdatesAsMarkdown, formatUpdatesCompact } from "../../src/publishers/format.js";
import { getPublisher, getAllPublishers, getPublisherNames } from "../../src/publishers/index.js";
import type { SummarizedUpdate } from "../../src/publishers/types.js";
import { googleDrivePublisher } from "../../src/publishers/google-drive.js";

const mockUpdates: SummarizedUpdate[] = [
  {
    sourceId: "openai",
    sourceName: "OpenAI",
    category: "commercial",
    items: [
      {
        title: "GPT-5 Released",
        date: "2026-02-19T00:00:00Z",
        summary: "新しいGPT-5モデルがリリースされました。推論速度が2倍に。",
        impact: "major",
        modelName: "GPT-5",
        version: "2026-02-19",
        url: "https://openai.com/blog/gpt-5",
        isNew: true,
      },
    ],
  },
  {
    sourceId: "ollama",
    sourceName: "Ollama",
    category: "local-llm",
    items: [
      {
        title: "Ollama v0.7.0",
        date: "2026-02-17T00:00:00Z",
        summary: "Structured Output対応。マルチモーダル改善。",
        impact: "major",
        version: "v0.7.0",
        url: "https://github.com/ollama/ollama/releases/tag/v0.7.0",
        isNew: true,
      },
    ],
  },
];

describe("formatUpdatesAsMarkdown", () => {
  it("generates valid markdown with headers", () => {
    const md = formatUpdatesAsMarkdown(mockUpdates);
    expect(md).toContain("# AI Latest Updates");
    expect(md).toContain("## Commercial AI APIs");
    expect(md).toContain("### OpenAI");
    expect(md).toContain("GPT-5 Released");
    expect(md).toContain("## Local LLM Managers");
    expect(md).toContain("### Ollama");
  });

  it("includes impact tags", () => {
    const md = formatUpdatesAsMarkdown(mockUpdates);
    expect(md).toContain("**[MAJOR]**");
  });

  it("includes new indicator", () => {
    const md = formatUpdatesAsMarkdown(mockUpdates);
    expect(md).toContain("🆕");
  });

  it("handles empty updates", () => {
    const md = formatUpdatesAsMarkdown([]);
    expect(md).toContain("# AI Latest Updates");
  });
});

describe("formatUpdatesCompact", () => {
  it("lists new items by impact", () => {
    const compact = formatUpdatesCompact(mockUpdates);
    expect(compact).toContain("[MAJOR]");
    expect(compact).toContain("GPT-5");
  });

  it("returns message for no updates", () => {
    const compact = formatUpdatesCompact([]);
    expect(compact).toBe("No new updates.");
  });
});

describe("publisher registry", () => {
  it("has local publisher", () => {
    expect(getPublisher("local")).toBeDefined();
    expect(getPublisher("local")!.name).toBe("local");
  });

  it("has claude-md publisher", () => {
    expect(getPublisher("claude-md")).toBeDefined();
  });

  it("has discord publisher", () => {
    expect(getPublisher("discord")).toBeDefined();
  });

  it("has slack publisher", () => {
    expect(getPublisher("slack")).toBeDefined();
  });

  it("has google-drive publisher", () => {
    expect(getPublisher("google-drive")).toBeDefined();
    expect(getPublisher("google-drive")!.name).toBe("google-drive");
  });

  it("returns undefined for unknown publisher", () => {
    expect(getPublisher("unknown")).toBeUndefined();
  });

  it("lists all publisher names", () => {
    const names = getPublisherNames();
    expect(names).toContain("local");
    expect(names).toContain("claude-md");
    expect(names).toContain("discord");
    expect(names).toContain("slack");
    expect(names).toContain("google-drive");
  });

  it("getAllPublishers returns array", () => {
    const all = getAllPublishers();
    expect(all.length).toBeGreaterThanOrEqual(5);
  });
});

describe("googleDrivePublisher", () => {
  it("has correct name", () => {
    expect(googleDrivePublisher.name).toBe("google-drive");
  });

  it("throws when config file is missing", async () => {
    const nonExistentDir = "/tmp/ai-watch-test-nonexistent";
    await expect(
      googleDrivePublisher.publish(mockUpdates, {
        driveCredentialsDir: nonExistentDir,
      }),
    ).rejects.toThrow("Google Drive config not found");
  });

  it("throws when OAuth client is missing", async () => {
    const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const tmpDir = "/tmp/ai-watch-test-oauth";
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      `${tmpDir}/.gdrive-config.json`,
      JSON.stringify({ folderId: "test-folder", convertToGDoc: false }),
    );

    try {
      await expect(
        googleDrivePublisher.publish(mockUpdates, {
          driveCredentialsDir: tmpDir,
        }),
      ).rejects.toThrow("OAuth client credentials not found");
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });

  it("throws when OAuth token is missing", async () => {
    const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const tmpDir = "/tmp/ai-watch-test-token";
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      `${tmpDir}/.gdrive-config.json`,
      JSON.stringify({ folderId: "test-folder", convertToGDoc: false }),
    );
    writeFileSync(
      `${tmpDir}/.gdrive-oauth-client.json`,
      JSON.stringify({ installed: { client_id: "x", client_secret: "y", redirect_uris: [] } }),
    );

    try {
      await expect(
        googleDrivePublisher.publish(mockUpdates, {
          driveCredentialsDir: tmpDir,
        }),
      ).rejects.toThrow("OAuth token not found");
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });
});
