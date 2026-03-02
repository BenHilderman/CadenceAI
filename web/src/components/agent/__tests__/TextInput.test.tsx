import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextInput } from "../TextInput";

describe("TextInput", () => {
  it("renders input with placeholder", () => {
    render(<TextInput onSend={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("No mic? Type a message...")
    ).toBeInTheDocument();
  });

  it("calls onSend with trimmed text on Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<TextInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("No mic? Type a message...");
    await user.type(input, "  hello world  {Enter}");

    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("calls onSend on send button click", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<TextInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("No mic? Type a message...");
    await user.type(input, "book a meeting");

    const sendBtn = screen.getByRole("button");
    await user.click(sendBtn);

    expect(onSend).toHaveBeenCalledWith("book a meeting");
  });

  it("does not call onSend when empty", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<TextInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("No mic? Type a message...");
    await user.type(input, "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables input and shows spinner when isLoading", () => {
    render(<TextInput onSend={vi.fn()} isLoading />);

    const input = screen.getByPlaceholderText("No mic? Type a message...");
    expect(input).toBeDisabled();
    expect(screen.getByTestId("icon-Loader2")).toBeInTheDocument();
  });
});
