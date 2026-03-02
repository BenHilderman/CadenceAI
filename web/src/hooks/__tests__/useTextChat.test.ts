import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextChat } from "../useTextChat";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

function makeOkResponse(data: Record<string, unknown>) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  };
}

describe("useTextChat", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useTextChat());

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.slots).toHaveLength(0);
    expect(result.current.bookedEvent).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("appends user message optimistically", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({
        response: "OK",
        tool_calls: [],
        slots: null,
        booked_event: null,
        busy_times: null,
      })
    );

    const { result } = renderHook(() => useTextChat());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    const userMsg = result.current.messages.find((m) => m.role === "user");
    expect(userMsg).toBeDefined();
    expect(userMsg!.text).toBe("Hello");
    expect(userMsg!.final).toBe(true);
  });

  it("appends assistant message on success", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({
        response: "Sure, checking your calendar.",
        tool_calls: [],
        slots: null,
        booked_event: null,
        busy_times: null,
      })
    );

    const { result } = renderHook(() => useTextChat());

    await act(async () => {
      await result.current.sendMessage("Book a meeting");
    });

    const botMsg = result.current.messages.find(
      (m) => m.role === "assistant"
    );
    expect(botMsg).toBeDefined();
    expect(botMsg!.text).toBe("Sure, checking your calendar.");
  });

  it("extracts slots from response", async () => {
    const slots = [
      {
        start_time: "2026-03-02T14:00:00",
        end_time: "2026-03-02T14:30:00",
        display_time: "2:00 PM",
        score: 0.9,
        reason: "Free",
      },
    ];

    mockFetch.mockResolvedValueOnce(
      makeOkResponse({
        response: "Found a slot.",
        tool_calls: [],
        slots,
        booked_event: null,
        busy_times: null,
      })
    );

    const { result } = renderHook(() => useTextChat());

    await act(async () => {
      await result.current.sendMessage("What's available?");
    });

    expect(result.current.slots).toEqual(slots);
  });

  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useTextChat());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.error).toBe("Network error");
    // Should also have an error assistant message
    const errorMsg = result.current.messages.find(
      (m) => m.role === "assistant" && m.text.includes("couldn't reach")
    );
    expect(errorMsg).toBeDefined();
  });
});
