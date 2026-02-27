"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import StarField from "@/components/StarField";
import { SlotPicker } from "./SlotPicker";
import { BookingForm } from "./BookingForm";
import { BookingConfirmation } from "./BookingConfirmation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Step = "pick" | "form" | "confirmed";

interface Profile {
  name: string;
  timezone: string;
  durations: number[];
  days_ahead: number;
}

interface BookingPageProps {
  slug: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

const ease = [0.16, 1, 0.3, 1] as const;

export function BookingPage({ slug }: BookingPageProps) {
  const reduced = useReducedMotion();
  const dur = reduced ? 0 : 0.35;

  const [step, setStep] = useState<Step>("pick");
  const [selectedSlot, setSelectedSlot] = useState<{
    start_time: string;
    end_time: string;
    display_time: string;
  } | null>(null);
  const [duration, setDuration] = useState(30);
  const [bookedResult, setBookedResult] = useState<{
    event: {
      id: string;
      title: string;
      start: string;
      end: string;
      html_link: string;
      meet_link: string;
    };
  } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/booking/profile/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <p className="text-muted mb-6">This booking page doesn&apos;t exist.</p>
          <Link
            href="/"
            className="text-accent-bright hover:text-foreground transition-colors text-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden nebula-bg">
      {/* Star field background */}
      <StarField starCount={600} />

      {/* Central radial glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 1000,
          height: 1000,
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 55%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-border glass">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-xs font-mono font-semibold tracking-[0.2em] text-accent-bright uppercase">
            CadenceAI
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-muted" />
          <span className="text-[10px] font-mono text-muted tracking-widest uppercase">
            Book a Meeting
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto px-4 py-12">
        {/* Profile loading skeleton */}
        {!profile && !notFound && (
          <div className="text-center mb-8 animate-pulse">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-raised border border-border mb-4" />
            <div className="h-6 w-40 bg-surface-raised rounded-lg mx-auto mb-2" />
            <div className="h-4 w-28 bg-surface-raised rounded-lg mx-auto" />
          </div>
        )}

        {/* Profile header */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="relative inline-flex items-center justify-center mb-4">
              {/* Radial glow backdrop */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
                  filter: "blur(16px)",
                  transform: "scale(2.5)",
                }}
              />
              <div className="relative w-14 h-14 rounded-full bg-accent/12 border border-accent/15 flex items-center justify-center glow-accent">
                <span className="text-xl font-bold text-accent-bright">
                  {profile.name.charAt(0)}
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {profile.name}
            </h1>
            <p className="text-sm text-muted mb-4">{profile.timezone}</p>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2">
              {(["pick", "form", "confirmed"] as Step[]).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "w-6 bg-accent"
                      : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Step transitions */}
        <AnimatePresence mode="wait">
          {step === "pick" && profile && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: dur, ease }}
            >
              <SlotPicker
                slug={slug}
                durations={profile.durations}
                daysAhead={profile.days_ahead}
                duration={duration}
                onDurationChange={setDuration}
                onSlotSelect={(slot) => {
                  setSelectedSlot(slot);
                  setStep("form");
                }}
                apiUrl={API_URL}
              />
            </motion.div>
          )}

          {step === "form" && selectedSlot && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: dur, ease }}
            >
              <BookingForm
                slug={slug}
                slot={selectedSlot}
                duration={duration}
                onBack={() => setStep("pick")}
                onBooked={(result) => {
                  setBookedResult(result);
                  setStep("confirmed");
                }}
                apiUrl={API_URL}
              />
            </motion.div>
          )}

          {step === "confirmed" && bookedResult && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.4, ease }}
            >
              <BookingConfirmation event={bookedResult.event} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
