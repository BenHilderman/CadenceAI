"use client";

import { useState, useCallback, useRef } from "react";
import { useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import type { TranscriptMessage } from "@/lib/types";

// Bot transcript chunks arriving within this window get merged into one bubble
const BOT_MERGE_WINDOW_MS = 2000;

/** Strip noise markers and non-English characters from transcribed text.
 *  Gemini's native audio STT sometimes outputs non-Latin scripts (e.g. Kannada)
 *  for short utterances. We enforce English-only by stripping everything outside
 *  basic ASCII letters, digits, and common punctuation. */
function cleanText(text: string): string {
  return text
    .replace(/<noise>/g, "")
    .replace(/[^a-zA-Z0-9\s.,!?'''"""():;\-\/&@#$%+=%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function useTranscript() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const lastBotTimestampRef = useRef(0);

  useRTVIClientEvent(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
    const cleaned = cleanText(data.text);
    if (!cleaned) return;

    // A user message breaks the bot merge window
    lastBotTimestampRef.current = 0;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === "user" && !lastMsg.final) {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, text: cleaned, final: data.final },
        ];
      }
      return [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text: cleaned,
          timestamp: Date.now(),
          final: data.final,
        },
      ];
    });
  });

  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    const cleaned = cleanText(data.text);
    if (!cleaned) return;

    const now = Date.now();
    const withinWindow = now - lastBotTimestampRef.current < BOT_MERGE_WINDOW_MS;
    lastBotTimestampRef.current = now;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];

      // Merge into previous bot message if within the merge window
      if (withinWindow && lastMsg && lastMsg.role === "assistant") {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, text: `${lastMsg.text} ${cleaned}` },
        ];
      }

      return [
        ...prev,
        {
          id: `bot-${now}`,
          role: "assistant",
          text: cleaned,
          timestamp: now,
          final: true,
        },
      ];
    });
  });

  const clear = useCallback(() => setMessages([]), []);

  return { messages, clear };
}
