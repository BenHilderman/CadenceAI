import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentStatus, type AgentActivity } from "../AgentStatus";

describe("AgentStatus", () => {
  it("renders nothing for idle", () => {
    const { container } = render(
      <AgentStatus activity={{ state: "idle" }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Checking your calendar…" for checking', () => {
    render(<AgentStatus activity={{ state: "checking" }} />);
    expect(
      screen.getByText("Checking your calendar\u2026")
    ).toBeInTheDocument();
  });

  it('shows "Found N open slot(s)" for found_slots (singular/plural)', () => {
    const { rerender } = render(
      <AgentStatus activity={{ state: "found_slots", count: 1 }} />
    );
    expect(screen.getByText("Found 1 open slot")).toBeInTheDocument();

    rerender(
      <AgentStatus activity={{ state: "found_slots", count: 3 }} />
    );
    expect(screen.getByText("Found 3 open slots")).toBeInTheDocument();
  });

  it('shows "Booking your meeting…" for booking', () => {
    render(<AgentStatus activity={{ state: "booking" }} />);
    expect(
      screen.getByText("Booking your meeting\u2026")
    ).toBeInTheDocument();
  });

  it('shows "Meeting booked!" for booked', () => {
    render(<AgentStatus activity={{ state: "booked" }} />);
    expect(screen.getByText("Meeting booked!")).toBeInTheDocument();
  });
});
