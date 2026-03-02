"use client";

import { useState, useEffect, useCallback } from "react";
import type { MonthCalendarData } from "@/lib/types";

function getApiBase(): string {
  const pipecatUrl =
    process.env.NEXT_PUBLIC_PIPECAT_URL || "http://localhost:7860/api/offer";
  return pipecatUrl.replace(/\/api\/offer$/, "");
}

export function useMonthCalendar(sessionId: string | null) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthCalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    fetch(
      `${getApiBase()}/api/auth/calendar/month?session=${sessionId}&year=${year}&month=${month}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load calendar");
        return res.json();
      })
      .then((d: MonthCalendarData) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [sessionId, year, month, refreshKey]);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  const goToPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const goToMonth = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  return { year, month, data, isLoading, error, goToPrevMonth, goToNextMonth, goToMonth, refetch };
}
