"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, RefreshCw } from "lucide-react";

interface ErrorHelpProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

interface ErrorInfo {
  title: string;
  help: string;
  action?: "reload" | "retry" | "auto-dismiss";
}

function classifyError(error: string): ErrorInfo {
  const lower = error.toLowerCase();

  if (lower.includes("mic") || lower.includes("notallowed") || lower.includes("permission")) {
    return {
      title: "Microphone blocked",
      help: "Click the lock icon in your browser's address bar, allow microphone access, then reload the page.",
      action: "reload",
    };
  }

  if (lower.includes("auth") || lower.includes("401") || lower.includes("credential") || lower.includes("expired")) {
    return {
      title: "Calendar access expired",
      help: "Your Google Calendar connection needs to be re-authorized. Please sign in again.",
    };
  }

  if (lower.includes("rate") || lower.includes("429") || lower.includes("too many")) {
    return {
      title: "Too many requests",
      help: "The server is rate-limiting requests. Wait a moment and try again.",
      action: "retry",
    };
  }

  if (lower.includes("conflict") || lower.includes("409") || lower.includes("taken")) {
    return {
      title: "Time slot taken",
      help: "That slot was booked by someone else. Ask for alternative times.",
      action: "auto-dismiss",
    };
  }

  if (lower.includes("connect") || lower.includes("fetch") || lower.includes("network") || lower.includes("econnrefused")) {
    return {
      title: "Connection failed",
      help: "Can't reach the server. Check your internet connection or try again.",
      action: "retry",
    };
  }

  return {
    title: "Something went wrong",
    help: error,
    action: "retry",
  };
}

export function ErrorHelp({ error, onRetry, onDismiss }: ErrorHelpProps) {
  const [dismissed, setDismissed] = useState(false);

  const info = useMemo(() => (error ? classifyError(error) : null), [error]);

  // Reset dismissed state when error changes
  useEffect(() => {
    setDismissed(false);
  }, [error]);

  // Auto-dismiss for conflict errors
  useEffect(() => {
    if (info?.action === "auto-dismiss") {
      const timer = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  const visible = error && info && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                {info.title}
              </h4>
              <p className="text-xs text-muted leading-relaxed">{info.help}</p>
            </div>
            <button
              onClick={() => {
                setDismissed(true);
                onDismiss?.();
              }}
              className="shrink-0 p-1 rounded-md text-muted hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {(info.action === "reload" || info.action === "retry") && (
            <div className="mt-3">
              <button
                onClick={() => {
                  if (info.action === "reload") {
                    window.location.reload();
                  } else {
                    onRetry?.();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-full px-3 py-1 transition-colors"
              >
                <RefreshCw size={10} />
                {info.action === "reload" ? "Reload page" : "Try again"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
