"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { PipecatClientProvider, PipecatClientAudio } from "@pipecat-ai/client-react";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

const SessionContext = createContext<string | null>(null);

export function useSessionId(): string | null {
  return useContext(SessionContext);
}

type TransportInternals = {
  keepAliveInterval: ReturnType<typeof setInterval> | null;
  stop: (...args: unknown[]) => Promise<void>;
};

function clearKeepAlive(transport: SmallWebRTCTransport) {
  const t = transport as unknown as TransportInternals;
  if (t.keepAliveInterval) {
    clearInterval(t.keepAliveInterval);
    t.keepAliveInterval = null;
  }
}

export function AgentProvider({ children, sessionId = null }: { children: React.ReactNode; sessionId?: string | null }) {
  const [client, setClient] = useState<PipecatClient | null>(null);

  useEffect(() => {
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME || "";
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";
    const hasTurnCreds = turnUsername.length > 0 && turnCredential.length > 0;

    // Public STUN fallbacks: always included so ICE gathering has multiple
    // paths to candidate discovery even when private TURN creds are missing
    // or metered.ca is temporarily unreachable. These are all free, globally
    // anycasted, and operated by major providers — no auth required.
    const stunServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.relay.metered.ca:80" },
    ];

    // Metered TURN relay — only attached when credentials are actually set.
    // Attaching entries with empty creds just wastes ICE gathering time and
    // generates noisy 401s in the console.
    const turnServers: RTCIceServer[] = hasTurnCreds
      ? [
          {
            urls: "turn:global.relay.metered.ca:80",
            username: turnUsername,
            credential: turnCredential,
          },
          {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: turnUsername,
            credential: turnCredential,
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: turnUsername,
            credential: turnCredential,
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: turnUsername,
            credential: turnCredential,
          },
        ]
      : [];

    const transport = new SmallWebRTCTransport({
      iceServers: [...stunServers, ...turnServers],
    });

    // Patch stop() to clear keepAlive BEFORE closing the data channel.
    // SmallWebRTCTransport v1.9.0 has a race: dc.close() triggers async
    // "close" event, but keepAlive fires dc.send() in the gap → InvalidStateError.
    const t = transport as unknown as TransportInternals;
    const originalStop = t.stop.bind(transport);
    t.stop = async (...args: unknown[]) => {
      clearKeepAlive(transport);
      return originalStop(...args);
    };

    const pipecatClient = new PipecatClient({
      transport,
      enableMic: true,
      enableCam: false,
    });

    setClient(pipecatClient);

    return () => {
      setClient(null);
      clearKeepAlive(transport);
      pipecatClient.disconnect().catch(() => {});
    };
  }, []);

  if (!client) return null;

  return (
    <SessionContext.Provider value={sessionId}>
      <PipecatClientProvider client={client}>
        <PipecatClientAudio />
        {children}
      </PipecatClientProvider>
    </SessionContext.Provider>
  );
}
