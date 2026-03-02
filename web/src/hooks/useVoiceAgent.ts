"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";

export function useVoiceAgent(sessionId?: string | null) {
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isConnected = transportState === "ready";
  const isConnecting =
    transportState === "authenticating" ||
    transportState === "connecting" ||
    transportState === "connected";

  useEffect(() => {
    if (isConnected) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const connect = useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      let url = process.env.NEXT_PUBLIC_PIPECAT_URL || "http://localhost:7860/api/offer";
      if (sessionId) {
        url += `${url.includes("?") ? "&" : "?"}session=${sessionId}`;
      }
      await client.connect({ webrtcUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, [client, sessionId]);

  const disconnect = useCallback(async () => {
    if (!client) return;
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }, [client]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    transportState,
    elapsed,
    error,
  };
}
