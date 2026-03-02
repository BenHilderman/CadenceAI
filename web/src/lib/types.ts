export interface BusyBlock {
  start: string;
  end: string;
}

export interface Slot {
  start_time: string;
  end_time: string;
  display_time: string;
  score: number;
  reason: string;
  date?: string;
}

export interface BookedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  html_link: string;
  meet_link: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
}

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  final: boolean;
}

export interface GraphTraceNode {
  node: string;
  status: "completed" | "running" | "error";
  duration_ms: number;
}

export interface MonthEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
}

export interface MonthCalendarData {
  year: number;
  month: number;
  events_by_date: Record<string, MonthEvent[]>;
}
