"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { VoiceVisualizer } from "@pipecat-ai/client-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranscript } from "@/hooks/useTranscript";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useTextChat } from "@/hooks/useTextChat";
import { useSessionId } from "./AgentProvider";
import { TranscriptPanel } from "./TranscriptPanel";
import { AuditLog } from "./AuditLog";
import { CalendarTimeline } from "./CalendarTimeline";
import { BookingConfirm } from "./BookingConfirm";
import { GraphVisualizer } from "./GraphVisualizer";
import { StatusBar } from "./StatusBar";
import { VoiceOrb } from "./VoiceOrb";
import { PromptHint } from "./PromptHint";
import { TextInput } from "./TextInput";
import { AgentStatus } from "./AgentStatus";
import { LiveCaptions } from "./LiveCaptions";
import type { AgentActivity } from "./AgentStatus";
import { ErrorHelp } from "./ErrorHelp";
import { MonthCalendar } from "./MonthCalendar";
import { Keyboard, PhoneOff } from "lucide-react";
import type { Slot } from "@/lib/types";

function deriveOrbState(
  transportState: string,
  isConnected: boolean,
  isConnecting: boolean,
  messages: { role: string; final: boolean }[]
): "idle" | "connecting" | "listening" | "speaking" | "processing" {
  if (isConnecting) return "connecting";
  if (!isConnected) return "idle";

  const last = messages[messages.length - 1];
  if (last) {
    if (last.role === "assistant" && !last.final) return "speaking";
    if (last.role === "user" && !last.final) return "listening";
  }

  return "listening";
}

export function VoiceAgent() {
  const sessionId = useSessionId();
  const { messages: voiceMessages } = useTranscript();
  const { entries: voiceEntries, slots: voiceSlots, bookedEvent: voiceBookedEvent, graphTrace, busyBlocks: voiceBusyBlocks } = useAuditLog();
  const { connect, disconnect, isConnected, isConnecting, transportState, phase, error: voiceError } = useVoiceAgent(sessionId);
  const {
    messages: textMessages,
    isLoading: textLoading,
    slots: textSlots,
    bookedEvent: textBookedEvent,
    busyBlocks: textBusyBlocks,
    auditEntries: textEntries,
    error: textError,
    sendMessage,
  } = useTextChat(sessionId);

  // Merge voice + text messages by timestamp
  const messages = useMemo(
    () => [...voiceMessages, ...textMessages].sort((a, b) => a.timestamp - b.timestamp),
    [voiceMessages, textMessages]
  );

  // Prefer most recent source for slots/bookedEvent
  const slots = textSlots.length > 0 ? textSlots : voiceSlots;
  const bookedEvent = textBookedEvent ?? voiceBookedEvent;
  const entries = useMemo(
    () => [...voiceEntries, ...textEntries].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [voiceEntries, textEntries]
  );

  // Merge busy blocks (prefer text over voice)
  const busyBlocks = textBusyBlocks.length > 0 ? textBusyBlocks : voiceBusyBlocks;

  // Derive calendar date from slots or check_availability params
  const calendarDate = useMemo(() => {
    const slotWithDate = slots.find((s) => s.date);
    if (slotWithDate?.date) return slotWithDate.date;
    if (slots.length > 0) {
      const d = new Date(slots[0].start_time);
      return d.toISOString().split("T")[0];
    }
    return null;
  }, [slots]);

  // "Prefer to type?" toggle
  const [showTextInput, setShowTextInput] = useState(false);

  // Pending intent across OAuth round-trip: if a guest says "book Monday at
  // 3pm" and then clicks Connect Calendar, the page reloads and all conversation
  // context is lost. We save their last meaningful utterance to sessionStorage
  // so we can offer to replay it after they return authenticated.
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  // On mount, check if there's a saved intent and we're now authenticated.
  // If so, show it as a "Continue from where you left off?" prompt.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionId) return; // only offer replay when authenticated
    try {
      const saved = sessionStorage.getItem("cadence_pending_intent");
      if (saved && saved.length > 0) {
        setPendingIntent(saved);
      }
    } catch {
      /* sessionStorage can throw in private mode — ignore */
    }
  }, [sessionId]);

  // Continuously save the latest meaningful user utterance to sessionStorage.
  // We save *any* user message longer than 6 characters (filters out "yes",
  // "no", "ok") so the last substantive request is available after a reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user" && (m.text?.length ?? 0) > 6);
    if (!lastUserMsg?.text) return;
    try {
      sessionStorage.setItem("cadence_pending_intent", lastUserMsg.text);
    } catch {
      /* ignore */
    }
  }, [messages]);

  const dismissPendingIntent = useCallback(() => {
    setPendingIntent(null);
    try {
      sessionStorage.removeItem("cadence_pending_intent");
    } catch {
      /* ignore */
    }
  }, []);

  const resumePendingIntent = useCallback(() => {
    if (!pendingIntent) return;
    sendMessage(pendingIntent);
    setShowTextInput(true); // surface the text panel so they can continue
    dismissPendingIntent();
  }, [pendingIntent, sendMessage, dismissPendingIntent]);

  // Pending slot booking state
  const [pendingSlotTime, setPendingSlotTime] = useState<string | null>(null);
  const isBookingRef = useRef(false);

  // Clear pending state when booking completes or loading finishes
  useEffect(() => {
    if (bookedEvent || (!textLoading && pendingSlotTime)) {
      setPendingSlotTime(null);
      isBookingRef.current = false;
    }
  }, [bookedEvent, textLoading, pendingSlotTime]);

  // Auto-fade "found_slots" after 3s
  const [foundSlotsExpired, setFoundSlotsExpired] = useState(false);
  const foundSlotsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slots.length > 0 && !bookedEvent && !isBookingRef.current) {
      setFoundSlotsExpired(false);
      foundSlotsTimerRef.current = setTimeout(() => setFoundSlotsExpired(true), 3000);
    } else {
      setFoundSlotsExpired(false);
    }
    return () => {
      if (foundSlotsTimerRef.current) clearTimeout(foundSlotsTimerRef.current);
    };
  }, [slots.length, bookedEvent]);

  // Derive agent activity status — priority order avoids jarring flash-backs
  const agentActivity: AgentActivity = useMemo(() => {
    if (bookedEvent) return { state: "booked" };
    if (isBookingRef.current) return { state: "booking" };
    const runningBookNode = graphTrace.find(
      (n) => n.status === "running" && n.node.toLowerCase().includes("book")
    );
    if (runningBookNode) return { state: "booking" };
    if (textLoading && slots.length === 0) return { state: "checking" };
    const hasRunningNode = graphTrace.some((n) => n.status === "running");
    if (hasRunningNode) return { state: "checking" };
    if (slots.length > 0 && !foundSlotsExpired) return { state: "found_slots", count: slots.length };
    return { state: "idle" };
  }, [bookedEvent, slots, graphTrace, textLoading, foundSlotsExpired]);

  // Current error from any source
  const currentError = voiceError || textError || null;

  // Route the ErrorHelp retry button to the right recovery action:
  // voice-coded errors call connect() (re-dial the voice session), while
  // text/other errors fall through to sending "Try again" into the text
  // channel. Without this, voice failures would silently send a text message
  // instead of actually retrying the voice connection.
  const handleErrorRetry = useCallback(() => {
    if (currentError?.startsWith("VOICE_ERR:")) {
      connect();
    } else {
      sendMessage("Try again");
    }
  }, [currentError, connect, sendMessage]);

  const orbState = useMemo(
    () => deriveOrbState(transportState, isConnected, isConnecting, voiceMessages),
    [transportState, isConnected, isConnecting, voiceMessages]
  );

  const handleSlotClick = useCallback(
    (slot: Slot) => {
      setPendingSlotTime(slot.start_time);
      isBookingRef.current = true;
      sendMessage(`Book the ${slot.display_time} slot`);
    },
    [sendMessage]
  );

  const hasCalendar = calendarDate && (slots.length > 0 || busyBlocks.length > 0);

  return (
    <div className="relative h-[calc(100vh-3.25rem)] max-w-[1440px] mx-auto overflow-hidden">
      {/* StatusBar — floating pill, top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <StatusBar />
      </div>

      {/* Identity — above orb, visible only pre-conversation */}
      <AnimatePresence>
        {orbState === "idle" && textMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="absolute top-[calc(50%-180px)] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
          >
            <span className="text-xl font-semibold text-foreground">Cadence</span>
            <span className="text-sm text-muted">Your AI scheduling assistant</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb — dead center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <VoiceOrb state={orbState} size="large" onClick={connect} showClickHint={textMessages.length === 0} hideLabel={orbState === "idle" && textMessages.length === 0} />
      </div>

      {/* LiveCaptions — centered below orb */}
      <div className="absolute top-[calc(50%_+_110px)] left-1/2 -translate-x-1/2 z-10">
        <LiveCaptions messages={messages} />
      </div>

      {/* AgentStatus — floating pill below captions, absolute positioned so it doesn't shift the orb */}
      <div className="absolute top-[calc(50%_+_180px)] left-1/2 -translate-x-1/2 z-10">
        <AgentStatus activity={agentActivity} />
      </div>

      {/* End call button — only visible once we're actually fully connected
          ("ready" phase), not during preflight/probing/connecting. Showing it
          earlier let users click End before there was a connection to end,
          which leaked in-flight getUserMedia prompts past the cancel point. */}
      <AnimatePresence>
        {phase === "ready" && (
          <motion.button
            key="end-call"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={disconnect}
            className="absolute top-[calc(50%_+_230px)] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-mono uppercase tracking-wider transition-colors"
            aria-label="End call"
          >
            <PhoneOff size={12} />
            End call
          </motion.button>
        )}
      </AnimatePresence>

      {/* TranscriptPanel — left HUD */}
      <div className="hidden lg:block absolute left-4 top-16 bottom-4 w-[340px] z-20 glass-hud opacity-90 hover:opacity-100 transition-opacity overflow-hidden rounded-2xl">
        <TranscriptPanel messages={messages} />
      </div>

      {/* Right panel — MonthCalendar always visible, scheduling content stacks below */}
      <div className="hidden lg:flex absolute right-4 top-16 bottom-4 w-[340px] z-20 flex-col gap-3 overflow-hidden">
        {/* MonthCalendar — always present */}
        <div className="glass-hud opacity-90 hover:opacity-100 transition-opacity rounded-2xl overflow-hidden shrink-0">
          <MonthCalendar sessionId={sessionId} bookedEvent={bookedEvent} />
        </div>

        {/* Scheduling content — appears when available, hides after booking */}
        <AnimatePresence>
          {hasCalendar && calendarDate && !bookedEvent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-hud overflow-hidden rounded-2xl shrink-0"
            >
              <CalendarTimeline
                date={calendarDate}
                busyBlocks={busyBlocks}
                slots={slots}
                bookedEvent={bookedEvent}
                onSlotClick={handleSlotClick}
                pendingSlotTime={pendingSlotTime}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bookedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="shrink-0"
            >
              <BookingConfirm event={bookedEvent} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* MonthCalendar is desktop-only (lg:) — hidden on mobile to avoid overlapping the voice orb */}

      {/* Mobile CalendarTimeline — visible below orb on small screens, hides after booking */}
      <AnimatePresence>
        {hasCalendar && calendarDate && !bookedEvent && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden absolute left-4 right-4 bottom-20 z-20 glass-hud rounded-2xl overflow-hidden max-h-[40vh]"
          >
            <CalendarTimeline
              date={calendarDate}
              busyBlocks={busyBlocks}
              slots={slots}
              bookedEvent={bookedEvent}
              onSlotClick={handleSlotClick}
              pendingSlotTime={pendingSlotTime}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls — ErrorHelp + PromptHint + "Prefer to type?" / TextInput */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 flex flex-col items-center gap-2">
        <ErrorHelp error={currentError} onRetry={handleErrorRetry} />

        {/* Pending intent banner — only shown after OAuth return when we have
            a saved utterance from the pre-auth conversation. One click sends
            it to the now-authenticated bot so the user doesn't have to repeat
            themselves. */}
        <AnimatePresence>
          {pendingIntent && (
            <motion.div
              key="pending-intent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-300 font-medium mb-1">Welcome back — want to continue?</p>
                  <p className="text-xs text-muted truncate">&ldquo;{pendingIntent}&rdquo;</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={resumePendingIntent}
                    className="text-[10px] font-mono uppercase tracking-wider text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-full px-2.5 py-1 transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={dismissPendingIntent}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-foreground transition-colors px-2 py-1"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt hints — visible only pre-conversation */}
        <AnimatePresence>
          {orbState === "idle" && textMessages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
            >
              <PromptHint onSelect={sendMessage} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text input toggle — demoted to subtle link until activated */}
        <AnimatePresence mode="wait">
          {showTextInput || textMessages.length > 0 ? (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <TextInput onSend={sendMessage} isLoading={textLoading} autoFocus={showTextInput} />
            </motion.div>
          ) : !isConnected ? (
            <motion.button
              key="type-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors py-1"
            >
              <Keyboard size={14} />
              Prefer to type?
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Hidden Pipecat VoiceVisualizers — SDK needs these rendered */}
      <div className="sr-only" aria-hidden="true">
        <VoiceVisualizer
          participantType="local"
          backgroundColor="transparent"
          barColor="#ffffff"
          barCount={5}
          barWidth={5}
          barGap={3}
          barMaxHeight={40}
          barOrigin="center"
        />
        <VoiceVisualizer
          participantType="bot"
          backgroundColor="transparent"
          barColor="#34d399"
          barCount={5}
          barWidth={5}
          barGap={3}
          barMaxHeight={40}
          barOrigin="center"
        />
      </div>
    </div>
  );
}
