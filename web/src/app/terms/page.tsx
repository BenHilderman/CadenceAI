"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StarField from "@/components/StarField";

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: April 11, 2026
        </p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Acceptance of Terms
            </h2>
            <p>
              By accessing or using CadenceAI (&ldquo;the Service&rdquo;), you
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, you may not use the Service. CadenceAI is provided
              as a personal project for demonstration and educational purposes.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Description of the Service
            </h2>
            <p>
              CadenceAI is a voice-powered scheduling assistant that helps you
              book meetings on your Google Calendar. The Service uses real-time
              voice conversation to collect meeting details, checks availability
              via the Google Calendar API, and creates events with Google Meet
              links on your behalf.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Your Google Account
            </h2>
            <p>
              To use CadenceAI, you must connect your Google account and grant
              access to your Google Calendar. You are responsible for maintaining
              the security of your Google account credentials. You can revoke
              CadenceAI&apos;s access at any time by visiting{" "}
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
              Acceptable Use
            </h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Create events on calendars you do not own or control</li>
              <li>
                Attempt to reverse engineer, disrupt, or overload the Service
              </li>
              <li>
                Impersonate others or misrepresent your affiliation with any
                person or entity
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No Warranty
            </h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, either express or
              implied. CadenceAI does not guarantee that the Service will be
              uninterrupted, error-free, or that scheduling outcomes will be
              accurate. You are solely responsible for verifying any events
              created on your calendar.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, CadenceAI and its creator
              shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of or related to
              your use of the Service, including but not limited to missed
              meetings, scheduling conflicts, or loss of data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Third-Party Services
            </h2>
            <p>
              CadenceAI relies on third-party services, including Google
              Calendar and Google Gemini. Your use of those services through
              CadenceAI is subject to their respective terms and privacy
              policies. CadenceAI is not responsible for the availability,
              accuracy, or behavior of those third-party services.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Changes to These Terms
            </h2>
            <p>
              These terms may be updated from time to time. Continued use of the
              Service after any changes constitutes acceptance of the new terms.
              The &ldquo;Last updated&rdquo; date at the top of this page
              indicates when the terms were most recently revised.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Termination
            </h2>
            <p>
              You may stop using the Service at any time by disconnecting your
              Google account. CadenceAI reserves the right to suspend or
              terminate access to the Service at its discretion, without notice,
              for any reason.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, contact{" "}
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
