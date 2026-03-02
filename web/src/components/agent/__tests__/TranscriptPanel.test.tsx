import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TranscriptPanel } from "../TranscriptPanel";
import type { TranscriptMessage } from "@/lib/types";

function msg(
  overrides: Partial<TranscriptMessage> & { role: "user" | "assistant" }
): TranscriptMessage {
  return {
    id: `msg-${Math.random()}`,
    text: "Hello",
    timestamp: Date.now(),
    final: true,
    ...overrides,
  };
}

describe("TranscriptPanel", () => {
  it('shows empty state ("Connect and start speaking") when no messages', () => {
    render(<TranscriptPanel messages={[]} />);
    expect(
      screen.getByText("Connect and start speaking")
    ).toBeInTheDocument();
  });

  it("renders user + assistant messages with labels", () => {
    const messages = [
      msg({ role: "user", text: "Book tomorrow at 2pm" }),
      msg({ role: "assistant", text: "Sure, checking your calendar." }),
    ];
    render(<TranscriptPanel messages={messages} />);

    expect(screen.getByText("Book tomorrow at 2pm")).toBeInTheDocument();
    expect(
      screen.getByText("Sure, checking your calendar.")
    ).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Cadence")).toBeInTheDocument();
  });

  it("shows typing indicator for finalized user message", () => {
    const messages = [msg({ role: "user", text: "Hello", final: true })];
    render(<TranscriptPanel messages={messages} />);

    // Typing indicator renders 3 dot spans inside a container with "Cadence" label
    const cadenceLabels = screen.getAllByText("Cadence");
    // There should be 2: one in the typing indicator
    expect(cadenceLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("no typing indicator when last message is assistant", () => {
    const messages = [
      msg({ role: "user", text: "Hello", final: true }),
      msg({ role: "assistant", text: "Hi there!" }),
    ];
    render(<TranscriptPanel messages={messages} />);

    // Only one "Cadence" label (from the assistant message itself)
    const cadenceLabels = screen.getAllByText("Cadence");
    expect(cadenceLabels).toHaveLength(1);
  });

  it("shows message count in header", () => {
    const messages = [
      msg({ role: "user", text: "One" }),
      msg({ role: "assistant", text: "Two" }),
      msg({ role: "user", text: "Three" }),
    ];
    render(<TranscriptPanel messages={messages} />);

    expect(screen.getByText("3 messages")).toBeInTheDocument();
  });
});
