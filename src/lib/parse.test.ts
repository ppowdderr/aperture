import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "./types";
import { applyPatch, parseMessage, patchSchema } from "./parse";
import { complete } from "./llm/client";

vi.mock("./llm/client", () => ({ complete: vi.fn() }));

const completeMock = vi.mocked(complete);
const empty: Preferences = {
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

beforeEach(() => {
  completeMock.mockReset();
});

describe("applyPatch", () => {
  it("turns no Wednesday and no 9ams into persistent preferences", () => {
    const next = applyPatch(empty, {
      addBlocks: [{ day: 2, start: 480, end: 1080, kind: "free" }],
      earliestStart: 600,
      reply: "No Wednesday and no 9ams.",
    });

    expect(next.blocks).toEqual([
      { id: "2-480-1080-free", day: 2, start: 480, end: 1080, kind: "free" },
    ]);
    expect(next.earliestStart).toBe(600);
  });
});

describe("patchSchema", () => {
  it("supplies a short fallback reply when a local model omits it", () => {
    expect(
      patchSchema.parse({
        addBlocks: [{ day: 2, start: 480, end: 1080, kind: "free" }],
      }),
    ).toMatchObject({ reply: "Preferences updated." });
  });

  it("treats a null boolean from a local model as an omitted field", () => {
    const parsed = patchSchema.parse({
      campusDaysTogether: null,
      earliestStart: 600,
    });

    expect(parsed.campusDaysTogether).toBeUndefined();
    expect(parsed.earliestStart).toBe(600);
  });
});

describe("parseMessage", () => {
  it("uses the configured adapter and includes current preferences and conversation context", async () => {
    completeMock.mockResolvedValue({
      earliestStart: 600,
      reply: "No classes before 09:00.",
    });

    const patch = await parseMessage(
      "No 9ams",
      "Current preferences: {}",
      [{ role: "you", text: "Fridays free" }],
    );

    expect(patch).toEqual({
      earliestStart: 600,
      reply: "No classes before 09:00.",
    });
    const prompt = String(completeMock.mock.calls[0][0]);
    expect(prompt).toContain("No 9ams");
    expect(prompt).toContain("Fridays free");
    expect(prompt).toContain("Current preferences");
  });
});
