// Shared Framer Motion variants & timing constants.
// Import what you need — every landing section pulls from here.

import type { Variants } from "framer-motion";

// --- Easing curves ---

export const ease = {
  out: [0.25, 0.46, 0.45, 0.94] as const, // general-purpose smooth out
  softOut: [0.22, 1, 0.36, 1] as const,    // slower decel, feels cinematic
  enter: [0, 0, 0.2, 1] as const,          // quick start, soft land
};

// --- Duration presets (seconds) ---

export const duration = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  dramatic: 0.8,
};

// --- Stagger presets (seconds between children) ---

export const stagger = {
  tight: 0.03,
  normal: 0.06,
  relaxed: 0.1,
  dramatic: 0.15,
};

// --- Common variants ---
// These cover 90% of reveal animations across the site.

// Fade up from below
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.softOut },
  },
};

// Fade in with a slight scale-up (good for cards, badges)
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: ease.out },
  },
};

// Parent container that staggers its children on reveal
export const sectionContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.relaxed,
      delayChildren: 0.05,
    },
  },
};

// Smaller fade-up for list items inside a staggered container
export const itemReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.softOut },
  },
};

// Slow fade-in, no movement — for subheadings and supporting text
export const cinematicFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: ease.softOut },
  },
};

// --- Hero-specific variants ---
// Used with overflow-hidden wrappers for a clip-mask "rise from below" effect.
// Not currently active on the heading, but kept for future use.

// Words slide up from behind a hidden edge with spring bounce
export const heroWordReveal: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: "0%",
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 100,
      mass: 0.8,
    },
  },
};

// Same clip-mask reveal + a slight scale pop for the accent word
export const heroAccentReveal: Variants = {
  hidden: { y: "110%", scale: 1.05 },
  visible: {
    y: "0%",
    scale: 1,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 90,
      mass: 0.8,
    },
  },
};

// Wider stagger so hero words build with dramatic timing
export const heroContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.3,
    },
  },
};
