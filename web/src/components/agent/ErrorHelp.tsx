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

function classifyVoiceCode(code: string): ErrorInfo {
  switch (code) {
    case "insecure-context":
      return {
        title: "Voice needs HTTPS",
        help: "Voice chat requires a secure connection. Reload the site over https:// and try again.",
      };
    case "mic-unsupported":
      return {
        title: "Voice not supported",
        help: "This browser doesn't support microphone access. Try the latest Chrome, Firefox, or Safari.",
      };
    case "mic-denied":
      return {
        title: "Microphone blocked",
        help: "Click the lock icon in the address bar, set Microphone to Allow, then reload the page.",
        action: "reload",
      };
    case "mic-missing":
      return {
        title: "No microphone found",
        help: "No input device detected. Plug in a mic and try again.",
        action: "retry",
      };
    case "mic-busy":
      return {
        title: "Microphone in use",
        help: "Another app (Zoom, Meet, Discord) is holding the mic. Close it and retry.",
        action: "retry",
      };
    case "mic-failed":
      return {
        title: "Microphone error",
        help: "Couldn't access the mic. Check your system audio settings and retry.",
        action: "retry",
      };
    case "mixed-content":
      return {
        title: "Blocked by browser",
        help: "Your browser is blocking the voice server because it's on an insecure address. The site needs to be served over HTTPS end-to-end.",
      };
    case "backend-unreachable":
      return {
        title: "Voice server offline",
        help: "Can't reach the voice server. It may be down, or a browser extension (ad blocker, privacy tool) is blocking WebRTC. Try Incognito or disable extensions for this site.",
        action: "retry",
      };
    case "connect-timeout":
      return {
        title: "Connection timed out",
        help: "The voice server didn't respond in time. Check your connection and retry.",
        action: "retry",
      };
    case "connect-timeout-chrome":
      return {
        title: "Chrome couldn't connect",
        help: "Chrome blocked or timed out the voice call. Common fixes: (1) disable ad blockers for this site, (2) try Incognito mode, (3) check chrome://settings/content/microphone, or (4) try Firefox.",
        action: "retry",
      };
    case "bad-url":
      return {
        title: "Voice misconfigured",
        help: "The voice server URL is invalid. This is a configuration issue.",
      };
    case "no-window":
    case "unknown":
    default:
      return {
        title: "Voice error",
        help: "Something went wrong connecting to voice chat.",
        action: "retry",
      };
  }
}

function classifyError(error: string): ErrorInfo {
  // Structured codes emitted by useVoiceAgent preflight + timeout.
  // Checked first so they never collide with keyword matching below.
  if (error.startsWith("VOICE_ERR:")) {
    return classifyVoiceCode(error.slice("VOICE_ERR:".length));
  }

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
