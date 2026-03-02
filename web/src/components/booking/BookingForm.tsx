"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";

interface BookingFormProps {
  slug: string;
  slot: {
    start_time: string;
    end_time: string;
    display_time: string;
  };
  duration: number;
  onBack: () => void;
  onBooked: (result: {
    event: {
      id: string;
      title: string;
      start: string;
      end: string;
      html_link: string;
      meet_link: string;
    };
  }) => void;
  apiUrl: string;
}

const inputClasses =
  "w-full rounded-xl bg-surface-raised/80 backdrop-blur-sm border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors";

export function BookingForm({
  slug,
  slot,
  duration,
  onBack,
  onBooked,
  apiUrl,
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = new Date(slot.start_time);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/booking/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          start_time: slot.start_time,
          duration_minutes: duration,
          guest_name: name.trim(),
          guest_email: email.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || data.detail || "Booking failed. Try another time.");
        return;
      }

      onBooked({ event: data.event });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        aria-label="Go back to slot selection"
        className="focus-ring flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors rounded-lg px-1 py-0.5"
      >
        <ArrowLeft size={14} />
        Change time
      </button>

      {/* Selected time summary */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-white/[0.06] border border-white/15 p-4 animate-connect-glow"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white">
            <Calendar size={14} />
            <span className="text-sm font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white">
            <Clock size={14} />
            <span className="text-sm font-medium">
              {timeStr} · {duration} min
            </span>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="booking-name" className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5 block">
            Name
          </label>
          <input
            id="booking-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="booking-email" className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5 block">
            Email
          </label>
          <input
            id="booking-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="booking-notes" className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5 block">
            Notes (optional)
          </label>
          <textarea
            id="booking-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What would you like to discuss?"
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </div>

        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="focus-ring w-full rounded-xl bg-white/15 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3.5 text-sm font-semibold text-white transition-all glow-accent-strong flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </motion.button>
      </form>
    </div>
  );
}
