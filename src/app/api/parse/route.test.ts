import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "@/lib/types";

vi.mock("@/lib/parse", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/parse")>();
  return { ...actual, parseMessage: vi.fn() };
});

const { parseMessage } = await import("@/lib/parse");
const { POST } = await import("./route");
const parseMock = vi.mocked(parseMessage);
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
const body = {
  programmeCode: "UTCMPSI",
  year: 3,
  message: "No classes on Wednesday and no 9ams",
  preferences: empty,
};
const post = (payload: unknown) =>
  POST(
    new Request("http://localhost/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

beforeEach(() => {
  parseMock.mockReset();
});

describe("POST /api/parse", () => {
  it("applies a validated Wednesday and no-9am patch", async () => {
    parseMock.mockResolvedValue({
      addBlocks: [{ day: 2, start: 480, end: 1080, kind: "free" }],
      earliestStart: 600,
      reply: "Wednesday off, nothing before 09:00.",
    });

    const response = await post(body);

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      preferences: Preferences;
      reply: string;
    };
    expect(data.preferences.blocks).toEqual([
      { id: "2-480-1080-free", day: 2, start: 480, end: 1080, kind: "free" },
    ]);
    expect(data.preferences.earliestStart).toBe(600);
    expect(data.reply).toContain("Wednesday");
  });

  it("returns unchanged preferences and a short message for unrelated input", async () => {
    parseMock.mockResolvedValue({
      reply: "That is not a timetable preference.",
    });

    const response = await post({ ...body, message: "The weather is nice" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      preferences: empty,
      reply: "That is not a timetable preference.",
    });
  });

  it("leaves preferences untouched when the model is unavailable", async () => {
    parseMock.mockRejectedValue(new Error("LLM unavailable"));

    const response = await post(body);

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "LLM unavailable" });
  });
});
