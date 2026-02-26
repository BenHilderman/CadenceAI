"use client";

import { useState, useEffect } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { PipecatClientProvider, PipecatClientAudio } from "@pipecat-ai/client-react";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<PipecatClient | null>(null);

  useEffect(() => {
    const transport = new SmallWebRTCTransport();
    const pipecatClient = new PipecatClient({
      transport,
      enableMic: true,
      enableCam: false,
    });

    setClient(pipecatClient);

    return () => {
      pipecatClient.disconnect().catch(() => {});
    };
  }, []);

  if (!client) return null;

  return (
    <PipecatClientProvider client={client}>
      <PipecatClientAudio />
      {children}
    </PipecatClientProvider>
  );
}
