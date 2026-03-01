import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveCaptions } from "../LiveCaptions";
import type { TranscriptMessage } from "@/lib/types";

// Mock the GlowingEffect component to avoid WebGL issues in tests
vi.mock("@/components/ui/glowing-effect", () => ({
  GlowingEffect: () => null,
}));

function msg(
  overrides: Partial<TranscriptMessage> & { role: "user" | "assistant" }
): TranscriptMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    text: "Hello",
    timestamp: Date.now(),
    final: false,
    ...overrides,
  };
}

describe("LiveCaptions", () => {
  it("renders nothing when messages is empty", () => {
    const { container } = render(<LiveCaptions messages={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders user caption text", () => {
    const messages = [msg({ role: "user", text: "Book a meeting" })];
    render(<LiveCaptions messages={messages} />);
    expect(screen.getByText("Book a meeting")).toBeInTheDocument();
  });

  it("renders assistant caption text", () => {
    const messages = [msg({ role: "assistant", text: "Checking your calendar." })];
    render(<LiveCaptions messages={messages} />);
    expect(screen.getByText("Checking your calendar.")).toBeInTheDocument();
  });

  it("shows You label for user messages", () => {
    const messages = [msg({ role: "user", text: "Hello" })];
    render(<LiveCaptions messages={messages} />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows Cadence label for assistant messages", () => {
    const messages = [msg({ role: "assistant", text: "Hi!" })];
    render(<LiveCaptions messages={messages} />);
    expect(screen.getByText("Cadence")).toBeInTheDocument();
  });

  it("truncates long text to 150 characters", () => {
    const longText = "A".repeat(200);
    const messages = [msg({ role: "assistant", text: longText })];
    render(<LiveCaptions messages={messages} />);
    // The truncated text starts with ellipsis and is 150 chars
    const displayedText = screen.getByText(/A{10,}/);
    expect(displayedText.textContent!.length).toBeLessThanOrEqual(150);
  });

  it("shows typing indicator when user message is final", () => {
    const messages = [msg({ role: "user", text: "Hello", final: true })];
    render(<LiveCaptions messages={messages} />);
    // Should show the Cadence typing indicator
    expect(screen.getByText("Cadence")).toBeInTheDocument();
  });

  it("linkifies URLs in caption text", () => {
    const messages = [
      msg({ role: "assistant", text: "Join at https://meet.google.com/abc" }),
    ];
    render(<LiveCaptions messages={messages} />);
    const link = screen.getByText("https://meet.google.com/abc");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://meet.google.com/abc");
  });
});
