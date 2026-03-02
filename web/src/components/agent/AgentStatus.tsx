"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, Check, AlertTriangle } from "lucide-react";

export type AgentActivity =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found_slots"; count: number }
  | { state: "booking" }
  | { state: "booked" }
  | { state: "error"; message: string };

interface AgentStatusProps {
  activity: AgentActivity;
}

const CONFIG: Record<
  Exclude<AgentActivity["state"], "idle">,
  { icon: React.ReactNode; getText: (a: AgentActivity) => string }
> = {
  checking: {
    icon: <Loader2 size={12} className="animate-spin" />,
    getText: () => "Checking your calendar\u2026",
  },
  found_slots: {
    icon: <Search size={12} />,
    getText: (a) =>
      `Found ${(a as { count: number }).count} open slot${(a as { count: number }).count === 1 ? "" : "s"}`,
  },
  booking: {
    icon: <Loader2 size={12} className="animate-spin" />,
    getText: () => "Booking your meeting\u2026",
  },
  booked: {
    icon: <Check size={12} />,
    getText: () => "Meeting booked!",
  },
  error: {
    icon: <AlertTriangle size={12} />,
    getText: (a) => (a as { message: string }).message,
  },
};

export function AgentStatus({ activity }: AgentStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {activity.state !== "idle" && (
        <motion.div
          key={activity.state}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md ${
            activity.state === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : activity.state === "booked"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.08] text-muted"
          }`}
        >
          {CONFIG[activity.state].icon}
          <span className="text-[11px] font-mono uppercase tracking-widest">
            {CONFIG[activity.state].getText(activity)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
