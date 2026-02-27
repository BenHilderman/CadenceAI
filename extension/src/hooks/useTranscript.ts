import { useState, useCallback } from "react";
import { useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import type { TranscriptMessage } from "../lib/types";

export function useTranscript() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  useRTVIClientEvent(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
    if (!data.text.trim()) return;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === "user" && !lastMsg.final) {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, text: data.text, final: data.final },
        ];
      }
      return [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text: data.text,
          timestamp: Date.now(),
          final: data.final,
        },
      ];
    });
  });

  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    if (!data.text.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: data.text,
        timestamp: Date.now(),
        final: true,
      },
    ]);
  });

  const clear = useCallback(() => setMessages([]), []);

  return { messages, clear };
}
