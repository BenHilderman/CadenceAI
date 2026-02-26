"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { TranscriptMessage } from "@/lib/types";

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
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    isAutoScrollRef.current = atBottom;
    setShowScrollBtn(!atBottom && messages.length > 0);
  }, [messages.length]);

  // Show typing indicator when last finalized message is from user
  const lastMsg = messages[messages.length - 1];
  const showTyping = lastMsg?.role === "user" && lastMsg.final;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          Transcript
        </span>
        {messages.length > 0 && (
          <span className="text-[10px] font-mono text-muted tabular-nums">
            {messages.length} messages
          </span>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-5 space-y-3"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              {/* Enhanced empty state: mini gradient orb */}
              <div className="relative mb-6">
                <div
                  className="h-16 w-16 rounded-full animate-orb-breathe"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #7c3aed, #a78bfa, #7c3aed)",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
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
                    className="w-[3px] rounded-full bg-accent/30"
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
            {messages.map((msg) => (
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
                      msg.role === "user" ? "text-right text-accent-bright/60" : "text-emerald-500/60"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <>
                        You
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-bright/60 ml-1.5 align-middle" />
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
                      ? "0 0 12px rgba(139, 92, 246, 0.15)"
                      : "0 0 12px rgba(52, 211, 153, 0.1)"
                    }}
                    animate={{ boxShadow: "0 0 0px transparent" }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent/10 text-accent-bright border border-accent/12 rounded-br-md"
                        : "bg-surface-raised text-foreground/80 border border-border rounded-bl-md"
                    } ${!msg.final && msg.role === "user" ? "opacity-50" : ""}`}
                  >
                    {msg.text}
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
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-raised border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent/30 transition-all flex items-center gap-1.5 shadow-lg"
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
