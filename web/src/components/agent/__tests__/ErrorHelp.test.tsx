import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorHelp } from "../ErrorHelp";

describe("ErrorHelp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when error is null", () => {
    const { container } = render(<ErrorHelp error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('classifies mic errors → "Microphone blocked" + reload button', () => {
    render(<ErrorHelp error="NotAllowedError: mic permission denied" />);

    expect(screen.getByText("Microphone blocked")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reload page/i })
    ).toBeInTheDocument();
  });

  it('classifies network errors → "Connection failed" + retry calls onRetry', async () => {
    vi.useRealTimers();
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorHelp error="fetch failed: network error" onRetry={onRetry} />);

    expect(screen.getByText("Connection failed")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    await user.click(retryBtn);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('classifies rate limit → "Too many requests"', () => {
    render(<ErrorHelp error="429 too many requests" />);
    expect(screen.getByText("Too many requests")).toBeInTheDocument();
  });

  it("classifies conflict → auto-dismiss after 4s", () => {
    render(<ErrorHelp error="409 conflict: slot taken" />);

    expect(screen.getByText("Time slot taken")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Time slot taken")).not.toBeInTheDocument();
  });

  it("dismisses on X click", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <ErrorHelp
        error="some unknown error"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // The X button contains the icon
    const closeBtn = screen.getByTestId("icon-X").closest("button")!;
    await user.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
