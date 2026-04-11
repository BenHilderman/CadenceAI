"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";

const CONNECT_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BACKOFF_MS = [1000, 3000, 6000];

type Phase =
  | "idle"
  | "preflight"
  | "probing"
  | "connecting"
  | "ready"
  | "reconnecting"
  | "failed";

// Silent audio unlock for iOS Safari — WebAudio context must be resumed
// inside a user gesture or all audio playback is muted.
function unlockAudioContext(): void {
  if (typeof window === "undefined") return;
  type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
  const w = window as WithWebkit;
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Play a zero-duration silent buffer to fully unlock on iOS
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* noop — unlock is best-effort */
  }
}

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userDisconnectedRef = useRef(false);
  const wasReadyRef = useRef(false);
  const currentUrlRef = useRef<string | null>(null);

  const isConnected = transportState === "ready";
  const isConnecting =
    transportState === "authenticating" ||
    transportState === "connecting" ||
    transportState === "connected" ||
    phase === "preflight" ||
    phase === "probing" ||
    phase === "reconnecting";

  useEffect(() => {
    if (isConnected) {
      wasReadyRef.current = true;
      setReconnectAttempt(0);
      setPhase("ready");
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

  // Shared dial sequence — used by initial connect AND reconnect, so the
  // preflight/probe/timeout guards always apply on every attempt.
  const dial = useCallback(async (url: string) => {
    if (!client) throw new Error("VOICE_ERR:no-client");
    setPhase("preflight");
    await preflightMic();
    setPhase("probing");
    await probeBackend(url);
    setPhase("connecting");
    await withTimeout(
      client.connect({ webrtcUrl: url }),
      CONNECT_TIMEOUT_MS,
      isChrome() ? "VOICE_ERR:connect-timeout-chrome" : "VOICE_ERR:connect-timeout"
    );
  }, [client]);

  const connect = useCallback(async () => {
    if (!client) return;
    // Fresh session — clear any stale reconnect state so a new click always
    // starts from zero and can't be mistaken for a continuation.
    userDisconnectedRef.current = false;
    wasReadyRef.current = false;
    setReconnectAttempt(0);
    setError(null);

    // Unlock audio inside the gesture — iOS Safari requires this or the
    // bot's voice plays silent even after a successful connection.
    unlockAudioContext();

    let url = process.env.NEXT_PUBLIC_PIPECAT_URL
      || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860"}/api/offer`;
    if (sessionId) {
      url += `${url.includes("?") ? "&" : "?"}session=${sessionId}`;
    }
    currentUrlRef.current = url;

    try {
      await dial(url);
    } catch (e) {
      try {
        await client.disconnect();
      } catch {
        /* noop */
      }
      setPhase("failed");
      setError(e instanceof Error ? e.message : "VOICE_ERR:unknown");
    }
  }, [client, sessionId, dial]);

  const disconnect = useCallback(async () => {
    // Mark this as a user-initiated disconnect so the reconnect watcher
    // doesn't treat it as a drop and immediately dial again.
    userDisconnectedRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setPhase("idle");
    setReconnectAttempt(0);
    if (!client) return;
    try {
      await client.disconnect();
    } catch {
      /* ignore disconnect errors */
    }
  }, [client]);

  // Auto-reconnect watcher: if transport drops after we successfully reached
  // "ready", try to reconnect with exponential backoff up to MAX_RECONNECT_ATTEMPTS.
  useEffect(() => {
    const dropped =
      wasReadyRef.current &&
      !userDisconnectedRef.current &&
      (transportState === "disconnected" || transportState === "error");

    if (!dropped) return;

    const url = currentUrlRef.current;
    if (!url) return;

    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setPhase("failed");
      setError("VOICE_ERR:reconnect-failed");
      return;
    }

    const delay = RECONNECT_BACKOFF_MS[reconnectAttempt] ?? 10000;
    setPhase("reconnecting");

    reconnectTimerRef.current = setTimeout(async () => {
      if (userDisconnectedRef.current) return;
      setReconnectAttempt((n) => n + 1);
      try {
        await dial(url);
      } catch (e) {
        // On failure, transportState will return to disconnected and this
        // effect will re-run with an incremented attempt counter.
        setError(e instanceof Error ? e.message : "VOICE_ERR:unknown");
      }
    }, delay);

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [transportState, reconnectAttempt, dial]);

  // Network online/offline — surface offline state immediately, resume on recovery.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      if (userDisconnectedRef.current) return;
      if (!wasReadyRef.current) return;
      if (isConnected) return;
      const url = currentUrlRef.current;
      if (!url) return;
      // Skip backoff on network recovery — user likely wants instant resume.
      setReconnectAttempt(0);
      dial(url).catch((e) => {
        setError(e instanceof Error ? e.message : "VOICE_ERR:unknown");
      });
    };

    const handleOffline = () => {
      if (wasReadyRef.current || phase !== "idle") {
        setError("VOICE_ERR:offline");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isConnected, phase, dial]);

  // Audio device change — log so it's visible in DevTools but don't auto-rebind.
  // SmallWebRTCTransport doesn't expose track replacement; auto-rebinding here
  // would require a full reconnect, which is jarring if the user just plugged
  // in a second mic they didn't intend to switch to.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const handler = () => {
      console.info("[voice] audio device change detected");
    };
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", handler);
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    transportState,
    phase,
    elapsed,
    error,
    reconnectAttempt,
  };
}
