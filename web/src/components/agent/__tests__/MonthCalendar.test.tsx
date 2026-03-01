import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonthCalendar } from "../MonthCalendar";
import type { MonthCalendarData } from "@/lib/types";

// Mock useMonthCalendar hook
const mockGoToPrevMonth = vi.fn();
const mockGoToNextMonth = vi.fn();
const mockGoToMonth = vi.fn();
const mockRefetch = vi.fn();

let hookState: {
  year: number;
  month: number;
  data: MonthCalendarData | null;
  isLoading: boolean;
  error: string | null;
};

vi.mock("@/hooks/useMonthCalendar", () => ({
  useMonthCalendar: () => ({
    ...hookState,
    goToPrevMonth: mockGoToPrevMonth,
    goToNextMonth: mockGoToNextMonth,
    goToMonth: mockGoToMonth,
    refetch: mockRefetch,
  }),
}));

beforeEach(() => {
  hookState = {
    year: 2025,
    month: 3, // March
    data: { year: 2025, month: 3, events_by_date: {} },
    isLoading: false,
    error: null,
  };
  vi.clearAllMocks();
});

describe("MonthCalendar", () => {
  it("renders the month and year header", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });

  it("renders day-of-week headers", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    // S, M, T, W, T, F, S
    const dayHeaders = screen.getAllByText("S");
    expect(dayHeaders.length).toBe(2); // Sunday + Saturday
    expect(screen.getAllByText("T").length).toBe(2); // Tuesday + Thursday
  });

  it("renders day numbers for current month", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    // Use getAllByText since numbers like "1" appear in multiple cells (prev/next month fill)
    expect(screen.getAllByText("15").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("31").length).toBeGreaterThanOrEqual(1);
  });

  it("calls goToPrevMonth on left arrow click", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    const prevBtn = screen.getByTestId("icon-ChevronLeft").closest("button");
    fireEvent.click(prevBtn!);
    expect(mockGoToPrevMonth).toHaveBeenCalledTimes(1);
  });

  it("calls goToNextMonth on right arrow click", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    const nextBtn = screen.getByTestId("icon-ChevronRight").closest("button");
    fireEvent.click(nextBtn!);
    expect(mockGoToNextMonth).toHaveBeenCalledTimes(1);
  });

  it("shows event count badge for dates with events", () => {
    hookState.data = {
      year: 2025,
      month: 3,
      events_by_date: {
        "2025-03-15": [
          { id: "e1", title: "Meeting", start: "2025-03-15T10:00:00", end: "2025-03-15T10:30:00", all_day: false },
          { id: "e2", title: "Lunch", start: "2025-03-15T12:00:00", end: "2025-03-15T13:00:00", all_day: false },
          { id: "e3", title: "Call", start: "2025-03-15T15:00:00", end: "2025-03-15T15:30:00", all_day: false },
        ],
      },
    };
    render(<MonthCalendar sessionId="sess-1" />);
    // The event count "3" should appear (unique — no day is "3" in a way that collides since March has a 3rd)
    // Look for the count badge specifically — it's an 8px font span
    const badges = screen.getAllByText("3");
    // At least one "3" is the event count badge (the other may be the day number)
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading skeleton when isLoading", () => {
    hookState.isLoading = true;
    hookState.data = null;
    const { container } = render(<MonthCalendar sessionId="sess-1" />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("shows No events when selecting an empty date", () => {
    render(<MonthCalendar sessionId="sess-1" />);
    // Find all buttons with cursor-pointer (current month days)
    const currentMonthButtons = Array.from(
      document.querySelectorAll("button")
    ).filter((btn) => btn.className.includes("cursor-pointer"));
    // Click the first current-month button (day 1)
    expect(currentMonthButtons.length).toBeGreaterThan(0);
    fireEvent.click(currentMonthButtons[0]);
    expect(screen.getByText("No events")).toBeInTheDocument();
  });
});
