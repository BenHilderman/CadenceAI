"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  sessionId: string | null;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for ?session=xxx from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get("session");
    if (urlSession) {
      sessionStorage.setItem("cadence_session", urlSession);
      // Clean URL without triggering navigation
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }

    const stored = urlSession || sessionStorage.getItem("cadence_session");

    if (urlSession) {
      // Came back from OAuth — clear the redirect flag
      sessionStorage.removeItem("cadence_auth_attempted");
    }

    if (!stored) {
      // Auto-redirect to Google OAuth if we haven't tried yet
      const alreadyAttempted = sessionStorage.getItem("cadence_auth_attempted");
      if (!alreadyAttempted) {
        sessionStorage.setItem("cadence_auth_attempted", "1");
        window.location.href = `${API_URL}/api/auth/google`;
        return; // Don't set isLoading false — we're redirecting
      }
      setIsLoading(false);
      return;
    }

    // Verify session with backend
    fetch(`${API_URL}/api/auth/me?session=${stored}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setEmail(data.email);
          setSessionId(stored);
          sessionStorage.removeItem("cadence_auth_attempted");
        } else {
          sessionStorage.removeItem("cadence_session");
        }
      })
      .catch(() => {
        sessionStorage.removeItem("cadence_session");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(() => {
    window.location.href = `${API_URL}/api/auth/google`;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("cadence_session");
    setIsAuthenticated(false);
    setEmail(null);
    setSessionId(null);
  }, []);

  return { isAuthenticated, isLoading, email, sessionId, login, logout };
}
