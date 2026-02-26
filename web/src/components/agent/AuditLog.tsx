"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Check, X, ChevronDown } from "lucide-react";
import type { AuditEntry } from "@/lib/types";

interface AuditLogProps {
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<string, string> = {
  check_availability: "text-accent-bright",
  create_event: "text-emerald-400",
};

function relativeTime(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 3) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function AuditEntry({ entry, index }: { entry: AuditEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const actionColor = ACTION_COLORS[entry.action] || "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
            entry.success ? "bg-emerald-400/60" : "bg-red-400/60"
          }`}
          style={{
            boxShadow: entry.success
              ? "0 0 8px rgba(52, 211, 153, 0.3)"
              : "0 0 8px rgba(248, 113, 113, 0.3)",
            border: entry.success ? "1px solid rgba(52, 211, 153, 0.2)" : "1px solid rgba(248, 113, 113, 0.2)",
          }}
        />
        {/* Vertical line (rendered via flex-1) */}
        <div className="w-px flex-1 bg-border/40 mt-1" />
      </div>

      {/* Entry card */}
      <motion.div
        layout
        className="flex-1 rounded-xl bg-surface-raised border border-border p-3 mb-2 cursor-pointer hover:border-border/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-1">
          <code className={`text-xs font-mono font-semibold ${actionColor}`}>
            {entry.action}()
          </code>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted/50 font-mono">
              {relativeTime(entry.timestamp)}
            </span>
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center ${
                entry.success ? "bg-emerald-500/15" : "bg-red-500/15"
              }`}
            >
              {entry.success ? (
                <Check size={10} className="text-emerald-400" />
              ) : (
                <X size={10} className="text-red-400" />
              )}
            </div>
          </div>
        </div>
        <div className="text-muted/60 font-mono text-[11px] leading-relaxed break-all">
          {JSON.stringify(entry.params, null, 0).slice(0, 100)}
          {JSON.stringify(entry.params).length > 100 && "..."}
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] font-mono text-muted/40 uppercase tracking-wider block mb-1">
                  Full Params
                </span>
                <pre className="text-[10px] font-mono text-muted/60 whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(entry.params, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand hint */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="flex justify-center mt-1"
        >
          <ChevronDown size={10} className="text-muted/30" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Terminal size={12} className="text-muted" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          Tool Calls
        </span>
      </div>
      <div className="overflow-y-auto p-3 flex-1">
        {entries.length === 0 && (
          <p className="text-muted/50 text-xs text-center py-6 font-mono">
            Waiting for tool calls...
          </p>
        )}
        <AnimatePresence initial={false}>
          {entries.map((entry, i) => (
            <AuditEntry key={`${entry.action}-${i}`} entry={entry} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
