import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// ── framer-motion mock ──────────────────────────────────────────────
function makeMotionComponent(tag: string) {
  return React.forwardRef((props: Record<string, unknown>, ref) => {
    const {
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      variants: _v,
      whileHover: _wh,
      whileTap: _wt,
      whileInView: _wi,
      layout: _l,
      layoutId: _li,
      ...rest
    } = props;
    return React.createElement(tag, { ...rest, ref });
  });
}

vi.mock("framer-motion", () => ({
  motion: {
    div: makeMotionComponent("div"),
    span: makeMotionComponent("span"),
    button: makeMotionComponent("button"),
    p: makeMotionComponent("p"),
    a: makeMotionComponent("a"),
    section: makeMotionComponent("section"),
    header: makeMotionComponent("header"),
    footer: makeMotionComponent("footer"),
    nav: makeMotionComponent("nav"),
    ul: makeMotionComponent("ul"),
    li: makeMotionComponent("li"),
    img: makeMotionComponent("img"),
    h1: makeMotionComponent("h1"),
    h2: makeMotionComponent("h2"),
    h3: makeMotionComponent("h3"),
    h4: makeMotionComponent("h4"),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useSpring: () => ({ set: vi.fn(), get: vi.fn(() => 0) }),
  useTransform: () => ({ get: vi.fn(() => 1) }),
  useMotionValue: () => ({ set: vi.fn(), get: vi.fn(() => 0) }),
  useReducedMotion: () => false,
}));

// ── lucide-react mock ───────────────────────────────────────────────
function makeIcon(name: string) {
  return (props: Record<string, unknown>) =>
    React.createElement("span", { "data-testid": `icon-${name}`, ...props });
}

vi.mock("lucide-react", () => ({
  Send: makeIcon("Send"),
  Loader2: makeIcon("Loader2"),
  Sparkles: makeIcon("Sparkles"),
  Search: makeIcon("Search"),
  Check: makeIcon("Check"),
  AlertTriangle: makeIcon("AlertTriangle"),
  X: makeIcon("X"),
  RefreshCw: makeIcon("RefreshCw"),
  Mic: makeIcon("Mic"),
  ChevronDown: makeIcon("ChevronDown"),
  Keyboard: makeIcon("Keyboard"),
  MicOff: makeIcon("MicOff"),
  PhoneOff: makeIcon("PhoneOff"),
}));

// ── window.matchMedia stub ──────────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── crypto.randomUUID polyfill ──────────────────────────────────────
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
    },
  });
}
