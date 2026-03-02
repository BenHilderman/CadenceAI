import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceAgent } from "../VoiceAgent";

// ── Mock all hooks ──────────────────────────────────────────────────
const mockConnect = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("@/hooks/useTranscript", () => ({
  useTranscript: () => ({ messages: [], clear: vi.fn() }),
}));

vi.mock("@/hooks/useAuditLog", () => ({
  useAuditLog: () => ({
    entries: [],
    slots: [],
    bookedEvent: null,
    graphTrace: [],
    busyBlocks: [],
  }),
}));

vi.mock("@/hooks/useVoiceAgent", () => ({
  useVoiceAgent: () => ({
    connect: mockConnect,
    disconnect: vi.fn(),
    isConnected: false,
    isConnecting: false,
    transportState: "idle",
    elapsed: 0,
    error: null,
  }),
}));

const mockTextChat = {
  messages: [] as { id: string; role: string; text: string; timestamp: number; final: boolean }[],
  isLoading: false,
  slots: [] as unknown[],
  bookedEvent: null,
  busyBlocks: [],
  auditEntries: [],
  error: null as string | null,
  sendMessage: mockSendMessage,
};

vi.mock("@/hooks/useTextChat", () => ({
  useTextChat: () => mockTextChat,
}));

// ── Mock pipecat-ai ─────────────────────────────────────────────────
vi.mock("@pipecat-ai/client-react", () => ({
  VoiceVisualizer: () => null,
  usePipecatClientMicControl: () => ({ isMicEnabled: true, enableMic: vi.fn() }),
}));

beforeEach(() => {
  mockConnect.mockReset();
  mockSendMessage.mockReset();
  mockTextChat.messages = [];
  mockTextChat.error = null;
  mockTextChat.isLoading = false;
  mockTextChat.slots = [];
  mockTextChat.bookedEvent = null;
});

describe("VoiceAgent", () => {
  it("shows identity in idle state", () => {
    render(<VoiceAgent />);

    expect(screen.getByText("Cadence")).toBeInTheDocument();
    expect(
      screen.getByText("Your AI scheduling assistant")
    ).toBeInTheDocument();
  });

  it('shows VoiceOrb idle ("Tap to talk")', () => {
    render(<VoiceAgent />);
    expect(screen.getByText("Tap to talk")).toBeInTheDocument();
  });

  it("shows PromptHint pre-conversation", () => {
    render(<VoiceAgent />);
    expect(screen.getByText("Ask me something like...")).toBeInTheDocument();
  });

  it('shows "Prefer to type?" link', () => {
    render(<VoiceAgent />);
    expect(screen.getByText("Prefer to type?")).toBeInTheDocument();
  });

  it('clicking "Prefer to type?" reveals TextInput', async () => {
    const user = userEvent.setup();
    render(<VoiceAgent />);

    await user.click(screen.getByText("Prefer to type?"));

    expect(
      screen.getByPlaceholderText("No mic? Type a message...")
    ).toBeInTheDocument();
  });

  it("sends message via TextInput", async () => {
    const user = userEvent.setup();
    render(<VoiceAgent />);

    // Reveal text input
    await user.click(screen.getByText("Prefer to type?"));

    const input = screen.getByPlaceholderText("No mic? Type a message...");
    await user.type(input, "Book tomorrow at 2pm{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith("Book tomorrow at 2pm");
  });

  it("sends prompt hint via sendMessage", async () => {
    const user = userEvent.setup();
    render(<VoiceAgent />);

    const hint = screen.getByRole("button", { name: /What's available/ });
    await user.click(hint);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "What's available this Friday afternoon?"
    );
  });

  it("hides identity + hints when messages exist", () => {
    mockTextChat.messages = [
      {
        id: "1",
        role: "user",
        text: "Hello",
        timestamp: Date.now(),
        final: true,
      },
    ];

    render(<VoiceAgent />);

    expect(
      screen.queryByText("Your AI scheduling assistant")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Ask me something like...")
    ).not.toBeInTheDocument();
  });

  it("renders TranscriptPanel", () => {
    render(<VoiceAgent />);
    expect(screen.getByText("Transcript")).toBeInTheDocument();
  });

  it("shows ErrorHelp on error", () => {
    mockTextChat.error = "fetch failed: network error";

    render(<VoiceAgent />);

    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });
});
