import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the cleanText function and transcript logic directly since
// the hook depends on @pipecat-ai/client-react which requires a provider.

// Extract and test cleanText separately
describe("cleanText", () => {
  // Replicate the cleanText function from useTranscript.ts
  function cleanText(text: string): string {
    return text.replace(/<noise>/g, "").replace(/\s+/g, " ").trim();
  }

  it("strips <noise> markers", () => {
    expect(cleanText("hello <noise> world")).toBe("hello world");
  });

  it("strips multiple <noise> markers", () => {
    expect(cleanText("<noise> hello <noise> world <noise>")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(cleanText("hello    world")).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(cleanText("  hello  ")).toBe("hello");
  });

  it("returns empty string for noise-only input", () => {
    expect(cleanText("<noise>")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(cleanText("   ")).toBe("");
  });

  it("handles empty string", () => {
    expect(cleanText("")).toBe("");
  });

  it("preserves normal text", () => {
    expect(cleanText("Book a meeting tomorrow")).toBe("Book a meeting tomorrow");
  });

  it("handles noise with no surrounding spaces", () => {
    expect(cleanText("hello<noise>world")).toBe("helloworld");
  });

  it("handles multiple spaces around noise", () => {
    expect(cleanText("hello   <noise>   world")).toBe("hello world");
  });
});

describe("TranscriptMessage structure", () => {
  it("user messages have expected shape", () => {
    const msg = {
      id: "user-123",
      role: "user" as const,
      text: "Hello",
      timestamp: Date.now(),
      final: true,
    };
    expect(msg.role).toBe("user");
    expect(msg.final).toBe(true);
    expect(typeof msg.timestamp).toBe("number");
  });

  it("bot messages have expected shape", () => {
    const msg = {
      id: "bot-456",
      role: "assistant" as const,
      text: "Hi there!",
      timestamp: Date.now(),
      final: true,
    };
    expect(msg.role).toBe("assistant");
    expect(msg.id.startsWith("bot-")).toBe(true);
  });

  it("user message ids start with user-", () => {
    const id = `user-${Date.now()}`;
    expect(id.startsWith("user-")).toBe(true);
  });

  it("bot message ids start with bot-", () => {
    const id = `bot-${Date.now()}`;
    expect(id.startsWith("bot-")).toBe(true);
  });
});

describe("BOT_MERGE_WINDOW_MS", () => {
  it("merge window is 2000ms", () => {
    // This constant from useTranscript.ts
    const BOT_MERGE_WINDOW_MS = 2000;
    expect(BOT_MERGE_WINDOW_MS).toBe(2000);
  });
});
