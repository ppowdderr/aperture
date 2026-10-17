import { describe, expect, it, vi } from "vitest";
import type { Solution } from "@/lib/types";

vi.mock("next/server", () => ({ connection: async () => undefined }));

const { POST } = await import("./route");

const prefs = { blocks: [], maxBackToBackHours: 4, maxGapHours: 3, campusDaysTogether: false, wantKeywords: [], pinned: [], excluded: [] };
const student = { programmeCode: "UTCMPSI", year: 3, passed: ["INFR08026", "INFR08027", "INFR08030", "INFR08031", "INFR08032"], background: {} };
const post = (body: unknown) =>
  POST(new Request("http://localhost/api/solve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("POST /api/solve", () => {
  it("returns solutions from committed data", async () => {
    const res = await post({ programmeCode: "UTCMPSI", year: 3, student, preferences: prefs });
    expect(res.status).toBe(200);
    expect(res.headers.get("Server-Timing")).toMatch(/^solve;dur=\d+$/);
    const solutions = (await res.json()) as Solution[];
    expect(solutions).toHaveLength(3);
    expect(solutions[0].courses).toContain("INFR09051");
    expect(solutions[0].rulesSatisfied[0].url).toMatch(/^https:\/\/www\.drps\.ed\.ac\.uk\//);
  });

  it("rejects an invalid block shape with the field path", async () => {
    const res = await post({
      programmeCode: "UTCMPSI",
      year: 3,
      student,
      preferences: { ...prefs, blocks: [{ id: "b", day: 7, start: 600, end: 540, kind: "never" }] },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid solve request");
    const block = body.issues.properties.preferences.properties.blocks.items[0].properties;
    expect(Object.keys(block).sort()).toEqual(["day", "kind"]);
    const backwards = await post({
      programmeCode: "UTCMPSI",
      year: 3,
      student,
      preferences: { ...prefs, blocks: [{ id: "b", day: 0, start: 600, end: 540, kind: "free" }] },
    });
    expect(backwards.status).toBe(400);
    const issues = (await backwards.json()).issues.properties.preferences.properties.blocks.items[0].properties;
    expect(Object.keys(issues)).toEqual(["end"]);
  });

  it("rejects non-JSON and unknown fields", async () => {
    const raw = await POST(new Request("http://localhost/api/solve", { method: "POST", body: "nope" }));
    expect(raw.status).toBe(400);
    const extra = await post({ programmeCode: "UTCMPSI", year: 3, student, preferences: prefs, grid: [] });
    expect(extra.status).toBe(400);
  });

  it("404s for an unknown programme or year", async () => {
    expect((await post({ programmeCode: "NOPE", year: 3, student, preferences: prefs })).status).toBe(404);
    expect((await post({ programmeCode: "UTCMPSI", year: 5, student, preferences: prefs })).status).toBe(404);
  });

  it("422s when pins and exclusions leave no legal year", async () => {
    const res = await post({
      programmeCode: "UTCMPSI",
      year: 3,
      student,
      preferences: { ...prefs, excluded: ["INFR09051"] },
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ solutions: [] });
  });
});
