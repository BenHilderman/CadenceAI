"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const PROMPTS = [
  "Book a 30 minute meeting tomorrow at 2pm called Vikara Demo",
  "What's available this Friday afternoon?",
  "Schedule a 1 hour sync next Tuesday morning",
];

interface PromptHintProps {
  onSelect?: (text: string) => void;
}

export function PromptHint({ onSelect }: PromptHintProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      <div className="flex items-center gap-1.5 text-muted text-sm">
        <Sparkles size={14} className="icon-glow" />
        <span>Ask me something like...</span>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            onClick={() => onSelect?.(prompt)}
            className="glass glass-border rounded-xl px-4 py-2.5 text-sm text-foreground/80 text-left
                       hover:text-foreground hover:border-white/12 transition-all cursor-pointer
                       hover:bg-white/[0.04]"
          >
            &ldquo;{prompt}&rdquo;
          </motion.button>
        ))}
      </div>
    </div>
  );
}
