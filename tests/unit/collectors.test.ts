import { describe, it, expect } from "vitest";
import { rssCollector } from "../../src/collectors/rss.js";
import { githubReleasesCollector } from "../../src/collectors/github-releases.js";
import { webScrapeCollector } from "../../src/collectors/web-scrape.js";
import { huggingfaceCollector } from "../../src/collectors/huggingface.js";
import { getCollector } from "../../src/collectors/index.js";

describe("getCollector", () => {
  it("returns RSS collector", () => {
    const c = getCollector("rss");
    expect(c.type).toBe("rss");
  });

  it("returns GitHub releases collector", () => {
    const c = getCollector("github-releases");
    expect(c.type).toBe("github-releases");
  });

  it("returns web-scrape collector", () => {
    const c = getCollector("web-scrape");
    expect(c.type).toBe("web-scrape");
  });

  it("returns huggingface collector", () => {
    const c = getCollector("huggingface");
    expect(c.type).toBe("huggingface");
  });

  it("throws on unknown type", () => {
    expect(() => getCollector("unknown" as any)).toThrow("Unknown collector type");
  });
});

describe("rssCollector", () => {
  it("returns error when URL is not provided", async () => {
    const result = await rssCollector.collect({ type: "rss" }, "test");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not configured");
  });
});

describe("githubReleasesCollector", () => {
  it("returns error when repo is not provided", async () => {
    const result = await githubReleasesCollector.collect({ type: "github-releases" }, "test");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not configured");
  });
});

describe("webScrapeCollector", () => {
  it("returns error when URL is not provided", async () => {
    const result = await webScrapeCollector.collect({ type: "web-scrape" }, "test");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not configured");
  });
});

describe("huggingfaceCollector", () => {
  it("returns error when config is incomplete", async () => {
    const result = await huggingfaceCollector.collect({ type: "huggingface" }, "test");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("incomplete");
  });
});
