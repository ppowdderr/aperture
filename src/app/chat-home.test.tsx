// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "../lib/types";
import { ChatHome } from "./chat-home";

const untouched: Preferences = {
  blocks: [],
  earliestStart: null,
  latestEnd: null,
  maxBackToBackHours: null,
  maxGapHours: null,
  campusDaysTogether: false,
  wantKeywords: [],
  pinned: [],
  excluded: [],
};

vi.mock("@/lib/use-solve", () => ({
  loadPreferences: () => untouched,
  savePreferences: vi.fn(),
  useProgrammeData: () => ({
    data: { years: [], courses: [], slots: [] },
    error: null,
  }),
  useSolve: (_student: unknown, preferences: Preferences) => ({
    solutions: [],
    status: "ready",
    error: null,
    ms: null,
    solvedFor: preferences,
    solveNow: vi.fn(),
  }),
}));

vi.mock("@/components/ChatConversation", () => ({
  ChatConversation: ({
    onPreferencesChange,
    onApplied,
  }: {
    onPreferencesChange: (next: Preferences) => void;
    onApplied?: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onPreferencesChange({ ...untouched, earliestStart: 600 });
        onApplied?.();
      }}
    >
      Open planner
    </button>
  ),
}));

afterEach(cleanup);

describe("ChatHome", () => {
  it("starts with the prompt and only reveals the result workspace after a message", () => {
    render(<ChatHome />);
    expect(screen.getByRole("heading", { name: "What should your week look like?" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Plans" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open planner" }));
    const plans = screen.getByRole("region", { name: "Plans" });
    expect(plans).toBeTruthy();
    expect(within(plans).getByText(/No legal year fits those constraints/)).toBeTruthy();
  });
});
