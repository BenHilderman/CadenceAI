"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import type { TranscriptMessage } from "@/lib/types";

/** URL regex for linkifying caption text */
const URL_RE = /https?:\/\/[^\s)>\]]+/g;

function Linkified({ text }: { text: string }) {
  const parts: (string | { url: string; key: number })[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(URL_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ url: match[0], key: key++ });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  if (parts.length === 1 && typeof parts[0] === "string") return <>{text}</>;

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all"
          >
            {p.url}
          </a>
        )
      )}
    </>
  );
}

interface LiveCaptionsProps {
  messages: TranscriptMessage[];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return "\u2026" + text.slice(text.length - (max - 1));
}

export function LiveCaptions({ messages }: LiveCaptionsProps) {
  // Track which message was auto-dismissed (by id) instead of a generic `visible` boolean.
  // This avoids the race condition where `visible=false` persists across new messages.
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  // Derive caption directly — no useMemo, avoids stale-reference issues
  let caption: {
    role: "user" | "assistant";
    text: string;
    streaming: boolean;
    waitingForAssistant?: boolean;
  } | null = null;

  if (lastMsg) {
    if (lastMsg.role === "user" && !lastMsg.final) {
      caption = { role: "user", text: lastMsg.text, streaming: true };
    } else if (lastMsg.role === "user" && lastMsg.final) {
      caption = { role: "user", text: lastMsg.text, streaming: false, waitingForAssistant: true };
    } else if (lastMsg.role === "assistant" && !lastMsg.final) {
      caption = { role: "assistant", text: lastMsg.text, streaming: true };
    } else if (lastMsg.role === "assistant" && lastMsg.final) {
      caption = { role: "assistant", text: lastMsg.text, streaming: false };
    }
  }

  // Auto-dismiss 4s after assistant finishes speaking
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (lastMsg?.role === "assistant" && lastMsg.final) {
      timerRef.current = setTimeout(() => setDismissedId(lastMsg.id), 4000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastMsg?.id, lastMsg?.role, lastMsg?.final]);

  // Nothing to show, or this specific message was dismissed
  const isDismissed = lastMsg ? lastMsg.id === dismissedId : true;
  if (!caption || isDismissed) return null;

  const isUser = caption.role === "user";
  const displayText = truncate(caption.text, 150);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lastMsg!.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-[min(28rem,calc(100vw-2rem))]"
      >
        <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative bg-white/[0.04] backdrop-blur-sm rounded-2xl px-5 py-3 overflow-hidden">
            {/* Role label */}
            <div className={`flex items-center gap-1.5 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUser ? "bg-white/60" : "bg-emerald-400/60"
                }`}
              />
              <span
                className={`text-[11px] font-mono tracking-wide ${
                  isUser ? "text-white/60" : "text-emerald-500/60"
                }`}
              >
                {isUser ? "You" : "Cadence"}
              </span>
            </div>

            {/* Caption text */}
            <p
              className={`text-sm leading-relaxed ${
                isUser ? "text-right text-white" : "text-left text-foreground/80"
              } ${caption.streaming ? "opacity-80" : "opacity-100"}`}
            >
              <Linkified text={displayText} />
            </p>

            {/* Typing indicator — user finished, waiting for assistant */}
            {caption.waitingForAssistant && (
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                <span className="text-[11px] font-mono tracking-wide text-emerald-500/60">
                  Cadence
                </span>
                <span className="flex gap-0.5 ml-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-emerald-400/50"
                      style={{
                        animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
