"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, GitBranch } from "lucide-react";
import type { GraphTraceNode } from "@/lib/types";

interface GraphVisualizerProps {
  trace: GraphTraceNode[];
}

const NODE_LABELS: Record<string, string> = {
  fetch_busy: "Fetch Busy",
  compute_slots: "Find Slots",
  rank: "Rank",
  verify_free: "Verify Free",
  book_event: "Book Event",
  return_error: "Conflict",
};

export function GraphVisualizer({ trace }: GraphVisualizerProps) {
  if (trace.length === 0) return null;

  const completedCount = trace.filter((n) => n.status === "completed").length;
  const progressPct = trace.length > 0 ? (completedCount / trace.length) * 100 : 0;
  const maxDuration = Math.max(...trace.map((n) => n.duration_ms), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl bg-surface border border-border overflow-hidden"
    >
      {/* Progress gradient background */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `linear-gradient(90deg, rgba(52, 211, 153, 0.03) 0%, rgba(52, 211, 153, 0.03) ${progressPct}%, transparent ${progressPct}%)`,
        }}
      />

      <div className="relative flex items-center gap-2 px-5 py-3 border-b border-border">
        <GitBranch size={12} className="text-accent-bright" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          Graph Pipeline
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted/50">
          {completedCount}/{trace.length}
        </span>
      </div>
      <div className="relative p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AnimatePresence initial={false}>
            {trace.map((node, i) => (
              <motion.div
                key={node.node}
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Node pill */}
                <div className="relative">
                  {/* Running node: pulsing ring */}
                  {node.status === "running" && (
                    <motion.div
                      className="absolute -inset-1 rounded-full"
                      style={{ border: "1px solid rgba(139, 92, 246, 0.2)" }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  {/* Completion flash */}
                  {node.status === "completed" && (
                    <motion.div
                      className="absolute -inset-0.5 rounded-full"
                      initial={{ opacity: 0.6, borderColor: "rgba(52, 211, 153, 0.4)" }}
                      animate={{ opacity: 0, borderColor: "rgba(52, 211, 153, 0)" }}
                      transition={{ duration: 0.8, delay: i * 0.15 + 0.2 }}
                      style={{ border: "1px solid" }}
                    />
                  )}

                  <div
                    className={`flex flex-col items-start rounded-xl px-3 py-2 border text-[11px] font-mono font-medium transition-all ${
                      node.status === "completed"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : node.status === "error"
                          ? "bg-red-500/10 border-red-500/25 text-red-400"
                          : "bg-accent/10 border-accent/25 text-accent-bright glow-accent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {node.status === "completed" && <CheckCircle2 size={10} />}
                      {node.status === "error" && <XCircle size={10} />}
                      {node.status === "running" && (
                        <Loader2 size={10} className="animate-spin" />
                      )}
                      {NODE_LABELS[node.node] || node.node}
                    </div>

                    {/* Duration bar */}
                    {node.duration_ms > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 w-full">
                        <div className="h-[2px] rounded-full bg-border/30 flex-1 overflow-hidden" style={{ maxWidth: 48 }}>
                          <motion.div
                            className={`h-full rounded-full ${
                              node.status === "completed"
                                ? "bg-emerald-400/40"
                                : "bg-accent-bright/40"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(node.duration_ms / maxDuration) * 100}%` }}
                            transition={{ duration: 0.4, delay: i * 0.15 + 0.2 }}
                          />
                        </div>
                        <span className="text-[9px] opacity-50">
                          {node.duration_ms}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector with particle dots */}
                {i < trace.length - 1 && (
                  <div className="relative flex items-center">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.15 + 0.1 }}
                      className="w-6 h-px bg-border origin-left"
                    />
                    {/* Particle dot flowing between completed nodes */}
                    {node.status === "completed" && (
                      <motion.div
                        className="absolute h-1 w-1 rounded-full bg-emerald-400/50"
                        style={{ left: 0, top: -0.5 }}
                        animate={{ x: [0, 24] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.3,
                        }}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
