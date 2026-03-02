import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceOrb } from "../VoiceOrb";

describe("VoiceOrb", () => {
  it('"Tap to talk" + Mic icon when idle with onClick', () => {
    render(<VoiceOrb state="idle" onClick={vi.fn()} />);

    expect(screen.getByText("Tap to talk")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Mic")).toBeInTheDocument();
  });

  it("correct label per non-idle state", () => {
    const states = [
      ["connecting", "Connecting"],
      ["listening", "Listening"],
      ["speaking", "Speaking"],
      ["processing", "Processing"],
    ] as const;

    for (const [state, label] of states) {
      const { unmount } = render(<VoiceOrb state={state} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("calls onClick when idle", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<VoiceOrb state="idle" onClick={onClick} />);

    // The click handler is on the motion.div container (rendered as div with cursor-pointer)
    // The label "Tap to talk" is a sibling span, so we need to find the orb div itself
    const orbContainer = screen.getByText("Tap to talk")
      .closest(".flex.flex-col")!
      .querySelector("[class*='cursor-pointer']") as HTMLElement;
    await user.click(orbContainer);

    expect(onClick).toHaveBeenCalled();
  });

  it("does NOT call onClick when non-idle", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<VoiceOrb state="listening" onClick={onClick} />);

    const label = screen.getByText("Listening");
    await user.click(label);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("hides label when hideLabel=true", () => {
    render(<VoiceOrb state="idle" hideLabel onClick={vi.fn()} />);

    expect(screen.queryByText("Tap to talk")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });
});
