// Landing page — assembles the full-screen hero, value strip, and footer.
// The navbar transitions from transparent to frosted glass on scroll.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StarField from "@/components/StarField";
import { Hero } from "@/components/landing/Hero";
import { ValueStrip } from "@/components/landing/ValueStrip";

export default function Home() {
  // Track scroll position to toggle navbar glass effect
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
      {/* Animated star field behind everything */}
      <StarField />

      {/* Soft bloom centered on the hero area */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 45% 35% at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Vignette — darkens the edges so focus stays on center content */}
      <div
        className="fixed inset-0 pointer-events-none z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Navbar — transparent at top, frosted glass after scrolling */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass glass-border"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <span className="text-xs font-mono font-semibold tracking-[0.2em] text-white uppercase text-glow-subtle">
            CadenceAI
          </span>
          <div className="flex items-center gap-4">
            <a
              href="#how-it-works"
              className="hidden sm:inline text-xs text-muted hover:text-white transition-colors duration-300"
            >
              How it works
            </a>
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-full btn-nav-glass px-4 py-1.5 text-xs font-semibold text-white transition-all duration-300"
            >
              Launch Demo
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content — sits above the background layers */}
      <div className="relative z-[3]">
        <Hero />
        <ValueStrip />

        {/* Minimal footer */}
        <footer>
          <div className="glow-line mx-6" />
          <div className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between">
            <span className="text-xs text-muted font-mono tracking-wider uppercase text-glow-subtle">
              CadenceAI
            </span>
            <div className="flex items-center gap-4">
              <Link href="/demo" className="text-xs text-muted hover:text-white transition-colors duration-300">
                Demo
              </Link>
              <Link href="/privacy" className="text-xs text-muted hover:text-white transition-colors duration-300">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
