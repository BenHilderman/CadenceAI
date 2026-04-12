"use client";

import { AgentProvider } from "@/components/agent/AgentProvider";
import { VoiceAgent } from "@/components/agent/VoiceAgent";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { GraphicsBoundary } from "@/components/ui/graphics-boundary";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { ArrowLeft, Calendar, LogOut } from "lucide-react";

export default function DemoPage() {
  const { isAuthenticated, isLoading, email, sessionId, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* WebGL shader background — chromatic wave */}
      <GraphicsBoundary>
        <div className="fixed inset-0 z-0">
          <WebGLShader speed={0.01} />
        </div>
      </GraphicsBoundary>

      {/* Radial vignette — keeps edges dark, centers the glow */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.92) 100%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-2 border-b border-border glass">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-xs font-mono font-semibold tracking-[0.2em] text-white uppercase">
            CadenceAI
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated && email ? (
            <>
              <span className="text-[10px] font-mono text-muted truncate max-w-[200px]">
                {email}
              </span>
              <button
                onClick={logout}
                className="text-muted hover:text-foreground transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : !isLoading ? (
            <button
              onClick={login}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted hover:text-white tracking-widest uppercase transition-colors"
            >
              <Calendar size={12} />
              Connect Calendar
            </button>
          ) : null}
        </div>
        {/* Gradient underline */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center h-[calc(100vh-3.25rem)]">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <AgentProvider sessionId={sessionId}>
          <div className="relative z-10">
            <VoiceAgent />
          </div>
        </AgentProvider>
      )}
    </div>
  );
}
