import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingConfirm } from "../BookingConfirm";
import type { BookedEvent } from "@/lib/types";

function makeEvent(overrides: Partial<BookedEvent> = {}): BookedEvent {
  return {
    id: "evt-123",
    title: "Product Sync",
    start: "2025-03-10T14:00:00",
    end: "2025-03-10T14:30:00",
    html_link: "https://calendar.google.com/event/abc",
    meet_link: "https://meet.google.com/xxx-yyy-zzz",
    ...overrides,
  };
}

describe("BookingConfirm", () => {
  it("renders the event title", () => {
    render(<BookingConfirm event={makeEvent()} />);
    expect(screen.getByText("Product Sync")).toBeInTheDocument();
  });

  it("renders the formatted date", () => {
    render(<BookingConfirm event={makeEvent()} />);
    // March 10, 2025 is a Monday
    expect(screen.getByText(/Monday/)).toBeInTheDocument();
    expect(screen.getByText(/March/)).toBeInTheDocument();
  });

  it("renders time range", () => {
    render(<BookingConfirm event={makeEvent()} />);
    // Should show start and end time with em-dash separator
    const timeEl = screen.getByText(/\u2014/);
    expect(timeEl).toBeInTheDocument();
  });

  it("renders Join Meet button when meet_link exists", () => {
    render(<BookingConfirm event={makeEvent()} />);
    const meetLink = screen.getByText("Join Meet");
    expect(meetLink).toBeInTheDocument();
    expect(meetLink.closest("a")).toHaveAttribute("href", "https://meet.google.com/xxx-yyy-zzz");
  });

  it("renders Calendar button when html_link exists", () => {
    render(<BookingConfirm event={makeEvent()} />);
    const calLink = screen.getByText("Calendar");
    expect(calLink).toBeInTheDocument();
    expect(calLink.closest("a")).toHaveAttribute("href", "https://calendar.google.com/event/abc");
  });

  it("hides Join Meet button when meet_link is empty", () => {
    render(<BookingConfirm event={makeEvent({ meet_link: "" })} />);
    expect(screen.queryByText("Join Meet")).not.toBeInTheDocument();
  });

  it("hides Calendar button when html_link is empty", () => {
    render(<BookingConfirm event={makeEvent({ html_link: "" })} />);
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
  });

  it("shows Booked label", () => {
    render(<BookingConfirm event={makeEvent()} />);
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("renders 16 confetti particles", () => {
    const { container } = render(<BookingConfirm event={makeEvent()} />);
    // Confetti particles are absolute-positioned divs with rounded-full class
    const confettiContainer = container.querySelector(".pointer-events-none");
    expect(confettiContainer).toBeInTheDocument();
    const particles = confettiContainer!.querySelectorAll(".rounded-full");
    expect(particles.length).toBe(16);
  });
});
