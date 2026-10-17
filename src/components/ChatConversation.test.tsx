// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Preferences, StudentState } from "../lib/types";
import { ChatConversation, describePreferenceChange } from "./ChatConversation";
import { emptyPreferences } from "./WeekGrid";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const student: StudentState = {
  programmeCode: "UTCMPSI",
  year: 3,
  passed: [],
  background: {},
};

const parsed: Preferences = {
  ...emptyPreferences(),
  blocks: [{ id: "fri", day: 4, start: 480, end: 1080, kind: "free" }],
  earliestStart: 600,
  campusDaysTogether: true,
  wantKeywords: ["databases"],
};

function setup(
  onPreferencesChange = vi.fn<(next: Preferences) => void>(),
  onApplied = vi.fn(),
  variant: "hero" | "docked" = "docked",
) {
  render(
    <ChatConversation
      student={student}
      preferences={emptyPreferences()}
      onPreferencesChange={onPreferencesChange}
      onApplied={onApplied}
      variant={variant}
    />,
  );
  return { onPreferencesChange, onApplied };
}

describe("describePreferenceChange", () => {
  it("summarises only what changed in plain language", () => {
    expect(describePreferenceChange(emptyPreferences(), parsed)).toBe(
      "Kept Friday free. Set no classes before 10:00. Keeping each campus to its own days. Interested in databases.",
    );
    expect(describePreferenceChange(parsed, parsed)).toBe("That didn't change your preferences.");
  });
});

describe("ChatConversation", () => {
  it("can open with a quiet returning-session note", () => {
    render(
      <ChatConversation
        student={student}
        preferences={parsed}
        onPreferencesChange={vi.fn()}
        initialMessage="Loaded your saved week."
      />,
    );
    expect(within(screen.getByRole("list", { name: "Conversation" })).getByText("Loaded your saved week.")).toBeTruthy();
  });

  it("keeps the first screen to a clean composer without tag-style prompts", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    setup(undefined, undefined, "hero");
    expect(screen.queryByRole("button", { name: "Fridays free" })).toBeNull();
    expect(screen.getByLabelText("Describe your week")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies a parsed message, confirms the change and opens the workspace", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ preferences: parsed, reply: "ignored", notes: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { onPreferencesChange, onApplied } = setup();

    fireEvent.change(screen.getByLabelText("Describe your week"), {
      target: { value: "No 9ams, Fridays free, I want databases" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(onPreferencesChange).toHaveBeenCalledWith(parsed));
    expect(onApplied).toHaveBeenCalledOnce();
    const conversation = within(screen.getByRole("list", { name: "Conversation" }));
    expect(conversation.getByText(/Kept Friday free/)).toBeTruthy();
    expect(conversation.getByText(/No 9ams, Fridays free, I want databases/)).toBeTruthy();
  });

  it("keeps preferences unchanged and explains a parse failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Name a day or time first." }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );
    const { onPreferencesChange, onApplied } = setup();

    fireEvent.change(screen.getByLabelText("Describe your week"), { target: { value: "Make it nice" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const conversation = within(screen.getByRole("list", { name: "Conversation" }));
    await waitFor(() => expect(conversation.getByText("Name a day or time first.")).toBeTruthy());
    expect(onPreferencesChange).not.toHaveBeenCalled();
    expect(onApplied).not.toHaveBeenCalled();
  });
});
