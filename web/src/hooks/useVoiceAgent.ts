"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";

const CONNECT_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 5000;

function isChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Desktop/mobile Chrome, but not Edge / Opera / older UAs that also ship "Chrome"
  return /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
}

async function preflightMic(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("VOICE_ERR:no-window");
  }
  if (!window.isSecureContext) {
    throw new Error("VOICE_ERR:insecure-context");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("VOICE_ERR:mic-unsupported");
  }

  // Explicitly grab the mic BEFORE pipecat does. This forces Chrome's permission
  // prompt to fire predictably, and any denial surfaces as a synchronous rejection
  // instead of pipecat's client.connect() hanging on a silent block.
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = (e as Error)?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("VOICE_ERR:mic-denied");
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new Error("VOICE_ERR:mic-missing");
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      throw new Error("VOICE_ERR:mic-busy");
    }
    throw new Error("VOICE_ERR:mic-failed");
  }
  // Release immediately; pipecat will open its own track.
  stream.getTracks().forEach((t) => t.stop());
}

async function probeBackend(offerUrl: string): Promise<void> {
  let origin: string;
  try {
    origin = new URL(offerUrl, window.location.href).origin;
  } catch {
    throw new Error("VOICE_ERR:bad-url");
  }

  // Mixed content — Chrome silently blocks HTTPS→HTTP, which manifests as an
  // infinite hang inside client.connect(). Catch it before we ever dial.
  if (window.location.protocol === "https:" && origin.startsWith("http:")) {
    throw new Error("VOICE_ERR:mixed-content");
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${origin}/api/health`, {
      method: "GET",
      signal: controller.signal,
      mode: "cors",
      cache: "no-store",
    });
  } catch {
    throw new Error("VOICE_ERR:backend-unreachable");
  } finally {
    clearTimeout(t);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

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
      let url = process.env.NEXT_PUBLIC_PIPECAT_URL
        || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860"}/api/offer`;
      if (sessionId) {
        url += `${url.includes("?") ? "&" : "?"}session=${sessionId}`;
      }

      // Preflight BEFORE pipecat touches the network — catches the silent-hang
      // scenarios (mic denied, mixed content, unreachable backend) so the UI
      // never gets stuck in an infinite "connecting" state.
      await preflightMic();
      await probeBackend(url);

      // Even after preflight, WebRTC ICE can stall (especially on Chrome w/
      // private-network or strict NAT). Hard-cap the wait so we always resolve.
      await withTimeout(
        client.connect({ webrtcUrl: url }),
        CONNECT_TIMEOUT_MS,
        isChrome() ? "VOICE_ERR:connect-timeout-chrome" : "VOICE_ERR:connect-timeout"
      );
    } catch (e) {
      // Tear down any half-open pipecat state so the user can retry cleanly.
      try {
        await client.disconnect();
      } catch {
        /* noop */
      }
      setError(e instanceof Error ? e.message : "VOICE_ERR:unknown");
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
