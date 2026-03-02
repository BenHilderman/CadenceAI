"use client";

import { useState, useCallback, useRef } from "react";
import type { TranscriptMessage, Slot, BookedEvent, AuditEntry, BusyBlock } from "@/lib/types";

interface ChatApiResponse {
  response: string;
  tool_calls: { name: string; args: Record<string, unknown>; result: Record<string, unknown> }[];
  slots: Slot[] | null;
  booked_event: BookedEvent | null;
  busy_times: BusyBlock[] | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

export function useTextChat(authSessionId?: string | null) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedEvent, setBookedEvent] = useState<BookedEvent | null>(null);
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(crypto.randomUUID());

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Append user message optimistically
    const userMsg: TranscriptMessage = {
      id: `text-user-${Date.now()}`,
      role: "user",
      text: text.trim(),
      timestamp: Date.now(),
      final: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    setError(null);

    try {
      const chatUrl = authSessionId
        ? `${API_URL}/api/chat?session=${authSessionId}`
        : `${API_URL}/api/chat`;
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          session_id: sessionId.current,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API returned ${res.status}`);
      }

      const data: ChatApiResponse = await res.json();

      // Append assistant response
      const assistantMsg: TranscriptMessage = {
        id: `text-bot-${Date.now()}`,
        role: "assistant",
        text: data.response,
        timestamp: Date.now(),
        final: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Extract slots and booked event
      if (data.slots) {
        setSlots(data.slots);
      }
      if (data.booked_event) {
        setBookedEvent(data.booked_event);
      }
      if (data.busy_times) {
        setBusyBlocks(data.busy_times);
      }

      // Build audit entries from tool calls
      if (data.tool_calls.length > 0) {
        const newEntries: AuditEntry[] = data.tool_calls.map((tc) => ({
          timestamp: new Date().toISOString(),
          action: tc.name,
          params: tc.args,
          result: tc.result,
          success: !tc.result.error,
        }));
        setAuditEntries((prev) => [...prev, ...newEntries]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      const errorMsg: TranscriptMessage = {
        id: `text-error-${Date.now()}`,
        role: "assistant",
        text: "Sorry, I couldn't reach the server. Please try again.",
        timestamp: Date.now(),
        final: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return { messages, isLoading, slots, bookedEvent, busyBlocks, auditEntries, error, sendMessage };
}
