"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StarField from "@/components/StarField";

export default function PrivacyPolicy() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden relative nebula-bg">
      <StarField />

      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 45% 35% at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      <div
        className="fixed inset-0 pointer-events-none z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass glass-border"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <span className="text-xs font-mono font-semibold tracking-[0.2em] text-white uppercase text-glow-subtle">
              CadenceAI
            </span>
          </div>
        </div>
      </nav>

      <div className="relative z-[3] pt-20 pb-10 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 3, 2026
        </p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              What CadenceAI Does
            </h2>
            <p>
              CadenceAI is a voice-powered scheduling assistant that helps you
              book meetings on your Google Calendar. It uses real-time voice
              conversation to collect meeting details, checks your calendar
              availability, and creates events with Google Meet links.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Data We Access
            </h2>
            <p>
              When you connect your Google account, CadenceAI requests access to
              your Google Calendar to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Read your calendar to check availability (FreeBusy API)</li>
              <li>
                Create calendar events with Google Meet links on your behalf
              </li>
            </ul>
            <p className="mt-2">
              We do not read, store, or share the contents of your existing
              calendar events. We only check whether time slots are free or busy.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Data Storage
            </h2>
            <p>
              CadenceAI does not store your personal data, calendar data, or
              Google account information on our servers. OAuth tokens are used
              only during your active session to interact with the Google Calendar
              API. Voice conversations are processed in real-time and are not
              recorded or stored.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Third-Party Services
            </h2>
            <p>CadenceAI uses the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Google Calendar API</strong> &mdash; to check availability
                and create events
              </li>
              <li>
                <strong>Google Gemini</strong> &mdash; to power the voice
                conversation
              </li>
            </ul>
            <p className="mt-2">
              Your data is processed according to each provider&apos;s own privacy
              policy.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Revoking Access
            </h2>
            <p>
              You can revoke CadenceAI&apos;s access to your Google account at any
              time by visiting{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-blue-400 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account Permissions
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Contact
            </h2>
            <p>
              If you have questions about this privacy policy, contact{" "}
              <a
                href="mailto:benjaminhilderman@gmail.com"
                className="text-blue-400 underline"
              >
                benjaminhilderman@gmail.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>

      <footer className="relative z-[3]">
        <div className="glow-line mx-6" />
        <div className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between">
          <span className="text-xs text-muted font-mono tracking-wider uppercase text-glow-subtle">
            CadenceAI
          </span>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-muted hover:text-white transition-colors duration-300">
              Home
            </Link>
            <Link href="/demo" className="text-xs text-muted hover:text-white transition-colors duration-300">
              Demo
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
