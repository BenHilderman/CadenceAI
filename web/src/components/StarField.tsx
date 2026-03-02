"use client";

import { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ─── Star spectral colors (realistic stellar temperatures) ─── */
const STAR_COLORS = [
  // O/B class — blue-white (hot stars, rare)
  { r: 155, g: 176, b: 255, weight: 0.04 },
  { r: 170, g: 191, b: 255, weight: 0.06 },
  // A class — white (common bright stars)
  { r: 202, g: 215, b: 255, weight: 0.15 },
  { r: 248, g: 247, b: 255, weight: 0.2 },
  // F class — yellow-white
  { r: 255, g: 244, b: 234, weight: 0.2 },
  // G class — yellow (sun-like)
  { r: 255, g: 229, b: 207, weight: 0.15 },
  // K class — orange
  { r: 255, g: 204, b: 170, weight: 0.12 },
  // M class — red-orange (cool stars, very common but dim)
  { r: 255, g: 183, b: 148, weight: 0.08 },
];

function pickStarColor() {
  let r = Math.random();
  for (const c of STAR_COLORS) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return STAR_COLORS[3]; // default white
}

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1 (0=far, 1=near) — drives parallax
  radius: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  twinkleDepth: number; // how much the star flickers
  driftSpeed: number;
  color: { r: number; g: number; b: number };
  hasDiffraction: boolean;
  hasGlow: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  width: number;
  brightness: number;
}

interface StarFieldProps {
  starCount?: number;
}

function createStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Power-law distribution — most stars are far/dim, few are near/bright
    const z = Math.pow(Math.random(), 2.2); // skewed toward 0 (far)

    const radius = 0.15 + z * 1.6 + Math.random() * 0.3;

    // Brightness follows z depth with variation
    const baseAlpha = 0.04 + z * 0.7 + Math.random() * 0.15;

    const driftSpeed = 0.005 + z * 0.06;

    const color = pickStarColor();

    // Only the brightest ~3% get diffraction spikes
    const hasDiffraction = z > 0.85 && radius > 1.3;
    // Top ~12% get a soft glow halo
    const hasGlow = z > 0.6;

    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      z,
      radius,
      baseAlpha: Math.min(baseAlpha, 0.95),
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.4 + Math.random() * 1.6,
      twinkleDepth: 0.05 + z * 0.25, // near stars shimmer more
      driftSpeed,
      color,
      hasDiffraction,
      hasGlow,
    });
  }
  return stars;
}

function spawnShootingStar(w: number, h: number): ShootingStar {
  // Start from a random edge, mostly from top/right
  const fromTop = Math.random() > 0.3;
  const x = fromTop ? Math.random() * w : w * (0.5 + Math.random() * 0.5);
  const y = fromTop ? -10 : Math.random() * h * 0.3;

  const angle = (Math.PI / 4) + Math.random() * (Math.PI / 6); // ~45-75 degrees
  const speed = 3 + Math.random() * 5;

  return {
    x,
    y,
    vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? -1 : 1),
    vy: Math.sin(angle) * speed,
    life: 0,
    maxLife: 40 + Math.random() * 60, // frames
    width: 1 + Math.random() * 1.5,
    brightness: 0.5 + Math.random() * 0.5,
  };
}

export default function StarField({ starCount = 120 }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingRef = useRef<ShootingStar[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0..1
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedMotion = useReducedMotion();

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Mouse parallax offset (subtle — max ±12px for nearest stars)
      const mx = (mouseRef.current.x - 0.5) * 2;
      const my = (mouseRef.current.y - 0.5) * 2;

      for (const star of starsRef.current) {
        // Parallax shift based on depth
        const px = star.x + mx * star.z * 12;
        const py = star.y + my * star.z * 12;

        // Twinkle — atmospheric scintillation
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase)
          * Math.sin(time * star.twinkleSpeed * 0.7 + star.twinklePhase * 1.3); // compound wave
        const alpha = Math.max(0.02, star.baseAlpha + twinkle * star.twinkleDepth);

        const { r, g, b } = star.color;

        // Star core
        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }

      // Shooting stars
      for (const s of shootingRef.current) {
        const progress = s.life / s.maxLife;
        const fade = progress < 0.1 ? progress / 0.1
          : progress > 0.6 ? 1 - ((progress - 0.6) / 0.4)
          : 1;
        const a = fade * s.brightness;

        const tailLen = 40 + progress * 60;
        const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const dx = -s.vx / mag * tailLen;
        const dy = -s.vy / mag * tailLen;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + dx, s.y + dy);
        ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.5})`;
        ctx.lineWidth = s.width;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.width * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.8})`;
        ctx.fill();
      }
    },
    []
  );

  const animate = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      let time = 0;
      let shootingTimer = 0;
      const shootingInterval = 180 + Math.random() * 300; // frames between shooting stars

      const loop = () => {
        time += 0.016;
        const { w, h } = sizeRef.current;

        // Drift stars upward (parallax — near stars move faster)
        for (const star of starsRef.current) {
          star.y -= star.driftSpeed;
          // Slight horizontal drift for organic feel
          star.x += Math.sin(time * 0.3 + star.twinklePhase) * 0.003 * star.z;
          if (star.y < -4) {
            star.y = h + 4;
            star.x = Math.random() * w;
          }
          // Wrap horizontally
          if (star.x < -4) star.x = w + 4;
          if (star.x > w + 4) star.x = -4;
        }

        // Shooting stars
        shootingTimer++;
        if (shootingTimer > shootingInterval) {
          shootingTimer = 0;
          shootingRef.current.push(spawnShootingStar(w, h));
        }
        // Update shooting stars
        shootingRef.current = shootingRef.current.filter((s) => {
          s.x += s.vx;
          s.y += s.vy;
          s.life++;
          return s.life < s.maxLife && s.x > -100 && s.x < w + 100 && s.y < h + 100;
        });

        draw(ctx, w, h, time);
        animRef.current = requestAnimationFrame(loop);
      };

      loop();
    },
    [draw]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      starsRef.current = createStars(starCount, w, h);

      if (reducedMotion) {
        draw(ctx, w, h, 0);
      }
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouse);

    if (!reducedMotion) {
      animate(ctx);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animRef.current);
    };
  }, [starCount, reducedMotion, draw, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 will-change-transform"
      aria-hidden="true"
    />
  );
}
