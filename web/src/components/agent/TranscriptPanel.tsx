"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { TranscriptMessage } from "@/lib/types";

/** URL regex for linkifying transcript text */
const URL_RE = /https?:\/\/[^\s)>\]]+/g;

/** Render text with clickable links */
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

  if (parts.length === 1 && typeof parts[0] === "string") {
    return <>{text}</>;
  }

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

/** Merge window for combining consecutive user messages into one bubble */
const USER_MERGE_WINDOW_MS = 2000;

/**
 * Build a clean transcript: skip non-final user messages,
 * merge consecutive final user messages within the merge window.
 */
function buildCleanTranscript(messages: TranscriptMessage[]): TranscriptMessage[] {
  const result: TranscriptMessage[] = [];
  for (const msg of messages) {
    // Skip non-final user messages (still being spoken)
    if (msg.role === "user" && !msg.final) continue;

    const last = result[result.length - 1];
    // Merge consecutive user messages within the window
    if (
      msg.role === "user" &&
      last?.role === "user" &&
      msg.timestamp - last.timestamp < USER_MERGE_WINDOW_MS
    ) {
      result[result.length - 1] = {
        ...last,
        text: `${last.text} ${msg.text}`,
        timestamp: msg.timestamp,
      };
    } else {
      result.push(msg);
    }
  }
  return result;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <span className="text-[10px] font-mono uppercase tracking-widest mb-1 block text-emerald-500/60">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60 mr-1.5 align-middle" />
          Cadence
        </span>
        <div className="rounded-2xl rounded-bl-md bg-surface-raised border border-border px-4 py-3 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-muted"
              style={{
                animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const cleanMessages = useMemo(() => buildCleanTranscript(messages), [messages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isAutoScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isAutoScrollRef.current = true;
      setShowScrollBtn(false);
    }
  }, []);

  useEffect(() => {
    if (isAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [cleanMessages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    isAutoScrollRef.current = atBottom;
    setShowScrollBtn(!atBottom && cleanMessages.length > 0);
  }, [cleanMessages.length]);

  // Show typing indicator when last finalized message is from user
  const lastCleanMsg = cleanMessages[cleanMessages.length - 1];
  const showTyping = lastCleanMsg?.role === "user" && lastCleanMsg.final;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          Transcript
        </span>
        {cleanMessages.length > 0 && (
          <span className="text-[10px] font-mono text-muted tabular-nums">
            {cleanMessages.length} messages
          </span>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-5 space-y-3"
        >
          {cleanMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              {/* Enhanced empty state: mini gradient orb */}
              <div className="relative mb-6">
                <div
                  className="h-16 w-16 rounded-full animate-orb-breathe"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ff3b3b, #3bff6e, #3b8bff, #ff3b3b)",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
                    filter: "blur(16px)",
                    transform: "scale(2)",
                  }}
                />
              </div>
              {/* Waveform bars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-white/30"
                    animate={{ height: [8, 18, 8] }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <p className="text-muted text-sm">
                Connect and start speaking
              </p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {cleanMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[85%]">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-widest mb-1 block ${
                      msg.role === "user" ? "text-right text-white/60" : "text-emerald-500/60"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <>
                        You
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60 ml-1.5 align-middle" />
                      </>
                    ) : (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60 mr-1.5 align-middle" />
                        Cadence
                      </>
                    )}
                  </span>
                  <motion.div
                    initial={{ boxShadow: msg.role === "user"
                      ? "0 0 12px rgba(255, 255, 255, 0.1)"
                      : "0 0 12px rgba(52, 211, 153, 0.1)"
                    }}
                    animate={{ boxShadow: "0 0 0px transparent" }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-white/[0.06] text-white border border-white/[0.08] rounded-br-md"
                        : "bg-surface-raised text-foreground/80 border border-border rounded-bl-md"
                    }`}
                  >
                    <Linkified text={msg.text} />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {showTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-raised border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-white/20 transition-all flex items-center gap-1.5 shadow-lg"
            >
              <ChevronDown size={12} />
              New messages
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
