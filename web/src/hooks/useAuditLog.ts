"use client";

import { useState, useRef } from "react";
import { useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import type { AuditEntry, Slot, BookedEvent, GraphTraceNode, BusyBlock } from "@/lib/types";

interface PendingCall {
  function_name: string;
  arguments: Record<string, unknown>;
}

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedEvent, setBookedEvent] = useState<BookedEvent | null>(null);
  const [graphTrace, setGraphTrace] = useState<GraphTraceNode[]>([]);
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const pendingCalls = useRef<Map<string, PendingCall>>(new Map());

  // Capture function name + arguments when the call starts
  useRTVIClientEvent(RTVIEvent.LLMFunctionCallInProgress, (data) => {
    if (data.tool_call_id && data.function_name) {
      pendingCalls.current.set(data.tool_call_id, {
        function_name: data.function_name,
        arguments: data.arguments ?? {},
      });
    }
  });

  // Capture result when the call finishes
  useRTVIClientEvent(RTVIEvent.LLMFunctionCallStopped, (data) => {
    const pending = pendingCalls.current.get(data.tool_call_id);
    if (!pending || data.cancelled) return;

    pendingCalls.current.delete(data.tool_call_id);

    const result =
      typeof data.result === "string"
        ? JSON.parse(data.result)
        : (data.result as Record<string, unknown>) ?? {};

    // Extract graph trace if present
    if (result.graph_trace && Array.isArray(result.graph_trace)) {
      setGraphTrace(result.graph_trace as GraphTraceNode[]);
    }

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action: pending.function_name,
      params: pending.arguments,
      result,
      success: !result.error,
    };

    setEntries((prev) => [...prev, entry]);

    if (
      pending.function_name === "check_availability" &&
      result.available_slots
    ) {
      setSlots(result.available_slots as Slot[]);
      if (result.busy_times && Array.isArray(result.busy_times)) {
        setBusyBlocks(result.busy_times as BusyBlock[]);
      }
    }

    if (
      pending.function_name === "create_event" &&
      result.success &&
      result.event
    ) {
      setBookedEvent(result.event as BookedEvent);
    }
  });

  return { entries, slots, bookedEvent, graphTrace, busyBlocks };
}
