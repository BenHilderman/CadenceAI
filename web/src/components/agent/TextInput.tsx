"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface TextInputProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export function TextInput({ onSend, isLoading, autoFocus }: TextInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    setValue("");
  }, [value, isLoading, onSend]);

  return (
    <div className="glass glass-border rounded-2xl flex items-center gap-2 px-4 py-2.5 w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="No mic? Type a message..."
        disabled={isLoading}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted
                   outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        className="flex items-center justify-center w-8 h-8 rounded-lg
                   bg-white/10 hover:bg-white/15 text-white
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  );
}
