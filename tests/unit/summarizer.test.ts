import { describe, it, expect } from "vitest";
import { simpleHash } from "../../src/summarizer/claude.js";

describe("simpleHash", () => {
  it("produces consistent hashes", () => {
    const a = simpleHash("test:https://example.com");
    const b = simpleHash("test:https://example.com");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = simpleHash("test1:https://example.com/a");
    const b = simpleHash("test2:https://example.com/b");
    expect(a).not.toBe(b);
  });

  it("returns a string", () => {
    const hash = simpleHash("hello world");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });
});
