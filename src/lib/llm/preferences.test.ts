import { beforeEach, describe, expect, it, vi } from "vitest";
import { complete } from "./client";
import { llmPreferencesSchema, parsePreferences } from "./preferences";

vi.mock("./client", () => ({
  complete: vi.fn(),
}));

const completeMock = vi.mocked(complete);

beforeEach(() => {
  completeMock.mockReset();
});

describe("parsePreferences", () => {
  it("turns the demo sentence into grid blocks, a campus preference and keywords", async () => {
    completeMock.mockResolvedValue({
      blocks: [
        { day: 4, start: 480, end: 1080, kind: "free" },
        { day: 0, start: 540, end: 600, kind: "free" },
        { day: 1, start: 540, end: 600, kind: "free" },
      ],
      campusDaysTogether: true,
      wantKeywords: ["databases"],
    });

    const result = await parsePreferences(
      "No 9ams on Monday or Tuesday, Fridays free, keep KB days together, I want databases",
    );

    expect(result.blocks).toHaveLength(3);
    expect(result.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          day: 4,
          start: 480,
          end: 1080,
          kind: "free",
        }),
        expect.objectContaining({ day: 0, start: 540, end: 600 }),
        expect.objectContaining({ day: 1, start: 540, end: 600 }),
      ]),
    );
    expect(result.blocks?.every((block) => block.id.startsWith("ask-"))).toBe(
      true,
    );
    expect(result.campusDaysTogether).toBe(true);
    expect(result.wantKeywords).toEqual(["databases"]);

    const prompt = completeMock.mock.calls[0][0];
    expect(prompt).toContain("No 9ams on Monday or Tuesday");
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("returns an empty partial for unrelated input", async () => {
    completeMock.mockResolvedValue({ blocks: [], wantKeywords: [] });
    await expect(parsePreferences("The weather is nice.")).resolves.toEqual({});
  });

  it("deduplicates keywords case-insensitively", async () => {
    completeMock.mockResolvedValue({
      blocks: [],
      wantKeywords: ["Databases", "databases", "Machine Learning"],
    });
    await expect(parsePreferences("I like databases")).resolves.toEqual({
      wantKeywords: ["Databases", "Machine Learning"],
    });
  });
});

describe("llmPreferencesSchema", () => {
  it("rejects non-hour-aligned, out-of-range and overlapping blocks", () => {
    expect(
      llmPreferencesSchema.safeParse({
        blocks: [{ day: 0, start: 570, end: 630, kind: "free" }],
        wantKeywords: [],
      }).success,
    ).toBe(false);
    expect(
      llmPreferencesSchema.safeParse({
        blocks: [{ day: 0, start: 420, end: 600, kind: "free" }],
        wantKeywords: [],
      }).success,
    ).toBe(false);
    expect(
      llmPreferencesSchema.safeParse({
        blocks: [
          { day: 0, start: 540, end: 660, kind: "free" },
          { day: 0, start: 600, end: 720, kind: "avoid" },
        ],
        wantKeywords: [],
      }).success,
    ).toBe(false);
  });
});
