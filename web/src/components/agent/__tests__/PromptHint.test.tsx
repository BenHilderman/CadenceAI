import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptHint } from "../PromptHint";

const PROMPTS = [
  "Book a 30 minute meeting tomorrow at 2pm called Vikara Demo",
  "What's available this Friday afternoon?",
  "Schedule a 1 hour sync next Tuesday morning",
];

describe("PromptHint", () => {
  it('renders all 3 prompt buttons with "Ask me something like..."', () => {
    render(<PromptHint />);

    expect(screen.getByText("Ask me something like...")).toBeInTheDocument();

    for (const prompt of PROMPTS) {
      expect(screen.getByRole("button", { name: new RegExp(prompt) })).toBeInTheDocument();
    }
  });

  it("calls onSelect with prompt text on click", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PromptHint onSelect={onSelect} />);

    const btn = screen.getByRole("button", { name: /What's available/ });
    await user.click(btn);

    expect(onSelect).toHaveBeenCalledWith(PROMPTS[1]);
  });

  it("renders safely without onSelect", async () => {
    const user = userEvent.setup();
    render(<PromptHint />);

    const btn = screen.getByRole("button", { name: /Book a 30/ });
    await user.click(btn);
    // No error thrown
  });
});
