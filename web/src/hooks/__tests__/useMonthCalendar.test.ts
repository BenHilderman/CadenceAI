import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMonthCalendar } from "../useMonthCalendar";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  // Default: return empty calendar data
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        year: 2025,
        month: 3,
        events_by_date: {},
      }),
  });
});

describe("useMonthCalendar", () => {
  it("starts with current year and month", () => {
    const now = new Date();
    const { result } = renderHook(() => useMonthCalendar(null));
    expect(result.current.year).toBe(now.getFullYear());
    expect(result.current.month).toBe(now.getMonth() + 1);
  });

  it("does not fetch when sessionId is null", () => {
    renderHook(() => useMonthCalendar(null));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches when sessionId is provided", async () => {
    const { result } = renderHook(() => useMonthCalendar("sess-1"));
    // Wait for the effect to fire
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("session=sess-1");
    expect(url).toContain("/api/auth/calendar/month");
  });

  it("goToPrevMonth decrements month", async () => {
    const { result } = renderHook(() => useMonthCalendar(null));
    const initialMonth = result.current.month;

    act(() => {
      result.current.goToPrevMonth();
    });

    if (initialMonth === 1) {
      expect(result.current.month).toBe(12);
      expect(result.current.year).toBe(new Date().getFullYear() - 1);
    } else {
      expect(result.current.month).toBe(initialMonth - 1);
    }
  });

  it("goToNextMonth increments month", async () => {
    const { result } = renderHook(() => useMonthCalendar(null));
    const initialMonth = result.current.month;

    act(() => {
      result.current.goToNextMonth();
    });

    if (initialMonth === 12) {
      expect(result.current.month).toBe(1);
      expect(result.current.year).toBe(new Date().getFullYear() + 1);
    } else {
      expect(result.current.month).toBe(initialMonth + 1);
    }
  });

  it("goToMonth sets specific year and month", () => {
    const { result } = renderHook(() => useMonthCalendar(null));

    act(() => {
      result.current.goToMonth(2024, 6);
    });

    expect(result.current.year).toBe(2024);
    expect(result.current.month).toBe(6);
  });

  it("sets error on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useMonthCalendar("sess-1"));

    await vi.waitFor(() => {
      expect(result.current.error).toBe("Failed to load calendar");
    });
  });

  it("refetch triggers a new fetch", async () => {
    const { result } = renderHook(() => useMonthCalendar("sess-1"));

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refetch();
    });

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("wraps from January to December on goToPrevMonth", () => {
    const { result } = renderHook(() => useMonthCalendar(null));
    const currentYear = result.current.year;

    // Navigate to January
    act(() => {
      result.current.goToMonth(currentYear, 1);
    });

    act(() => {
      result.current.goToPrevMonth();
    });

    expect(result.current.month).toBe(12);
    expect(result.current.year).toBe(currentYear - 1);
  });
});
