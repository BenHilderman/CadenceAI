import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceAgent } from "../hooks/useVoiceAgent";
import { useTranscript } from "../hooks/useTranscript";
import { useAuditLog } from "../hooks/useAuditLog";
import { VoiceOrb } from "./VoiceOrb";
import { SlotCards } from "./SlotCards";
import { BookingConfirm } from "./BookingConfirm";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "processing";

export function ExtensionAgent() {
  const { connect, disconnect, isConnected, isConnecting, transportState, elapsed } =
    useVoiceAgent();
  const { messages } = useTranscript();
  const { slots, bookedEvent } = useAuditLog();

  let orbState: OrbState = "idle";
  if (isConnecting) orbState = "connecting";
  else if (isConnected) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "user" && !lastMsg.final) {
      orbState = "listening";
    } else if (lastMsg && lastMsg.role === "assistant") {
      orbState = "speaking";
    } else {
      orbState = "listening";
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#050507",
        color: "#f5f5f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid #1e1e2a",
          background: "rgba(12, 12, 16, 0.7)",
          backdropFilter: "blur(16px)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "#a78bfa",
            textTransform: "uppercase",
          }}
        >
          CadenceAI
        </span>
        {isConnected && (
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64647a" }}>
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {/* Orb area */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <VoiceOrb state={orbState} size={120} />

        {/* Connect/disconnect button */}
        <button
          onClick={isConnected ? disconnect : connect}
          style={{
            marginTop: 16,
            padding: "8px 24px",
            borderRadius: 999,
            border: isConnected ? "1px solid #1e1e2a" : "none",
            background: isConnected ? "transparent" : "#6c5ce7",
            color: isConnected ? "#64647a" : "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {isConnecting ? "Connecting..." : isConnected ? "End Session" : "Start Talking"}
        </button>
      </div>

      {/* Transcript area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 16px",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 8,
              padding: "8px 12px",
              borderRadius: 12,
              background: msg.role === "user" ? "rgba(108, 92, 231, 0.1)" : "rgba(12, 12, 16, 0.7)",
              border: `1px solid ${msg.role === "user" ? "rgba(108, 92, 231, 0.2)" : "#1e1e2a"}`,
              fontSize: 13,
              lineHeight: 1.5,
              color: msg.role === "user" ? "#a78bfa" : "#f5f5f7",
            }}
          >
            {msg.text}
          </div>
        ))}

        {/* Slot cards */}
        <AnimatePresence>
          {slots.length > 0 && !bookedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 8 }}
            >
              <SlotCards slots={slots} compact />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booking confirmation */}
        <AnimatePresence>
          {bookedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 8 }}
            >
              <BookingConfirm event={bookedEvent} compact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
