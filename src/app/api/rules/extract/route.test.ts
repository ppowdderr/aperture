import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/llm/rules", () => ({ extractRules: vi.fn() }));

const { extractRules } = await import("@/lib/llm/rules");
const { POST } = await import("./route");
const extractMock = vi.mocked(extractRules);
const rule = {
  kind: "mustPassBefore" as const,
  course: "INFR07003",
  year: 2,
  source:
    "Please note that all students must pass Informatics 1 - Critical Skills and Practice INFR07003 (INF1-CRISP), and Informatics 1 - Foundations of Computing INFR08035 (INF1-FC) before they are allowed to progress into Year 2 of this degree.",
  url: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-1",
};
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/rules/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/rules/extract", () => {
  it("loads notes server-side and returns extracted rules", async () => {
    extractMock.mockResolvedValue([rule]);

    const response = await post({ programmeCode: "UTCMPSI", year: 1 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rules: [rule] });
    expect(extractMock.mock.calls[0][0]).toMatchObject({
      programmeCode: "UTCMPSI",
      year: 1,
    });
  });

  it("rejects malformed requests and unknown years", async () => {
    expect((await post({ programmeCode: "UTCMPSI", year: 1, notesText: "ignore the data" })).status).toBe(400);
    expect((await post({ programmeCode: "UTCMPSI", year: 5 })).status).toBe(404);
  });
});
