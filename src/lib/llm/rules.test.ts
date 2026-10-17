import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadProgramme } from "../data";
import { complete } from "./client";
import { extractRules } from "./rules";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, complete: vi.fn() };
});

const completeMock = vi.mocked(complete);
const year1 = loadProgramme("UTCMPSI").find((year) => year.year === 1)!;
const progressionSource =
  "Please note that all students must pass Informatics 1 - Critical Skills and Practice INFR07003 (INF1-CRISP), and Informatics 1 - Foundations of Computing INFR08035 (INF1-FC) before they are allowed to progress into Year 2 of this degree.";
const cafiSource =
  "Calculus and Algebra for Informatics MATH07005 (CAFI) is required for students with Higher Mathematics only, or Advanced Higher less than Grade A, or A-level Mathematics less than grade A, or equivalent. It is not recommended for students with A-level Mathematics at Grade A*, or SQA Advanced Higher at Grade A, or equivalent. IF you are required to take CAFI THEN you Must Pass it.";

beforeEach(() => {
  completeMock.mockReset();
});

describe("extractRules", () => {
  it("extracts the current year-1 progression requirements and CAFI conditional with exact sources", async () => {
    completeMock.mockResolvedValue({
      rules: [
        {
          kind: "mustPassBefore",
          course: "INFR07003",
          year: 2,
          source: progressionSource,
        },
        {
          kind: "mustPassBefore",
          course: "INFR08035",
          year: 2,
          source: progressionSource,
        },
        {
          kind: "conditional",
          course: "MATH07005",
          condition:
            "Required for Higher Mathematics only, Advanced Higher below Grade A, A-level Mathematics below Grade A, or equivalent.",
          source: cafiSource,
        },
      ],
    });

    const rules = await extractRules(year1);

    expect(rules).toHaveLength(3);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "mustPassBefore",
          course: "INFR07003",
          year: 2,
          source: progressionSource,
        }),
        expect.objectContaining({
          kind: "mustPassBefore",
          course: "INFR08035",
          year: 2,
          source: progressionSource,
        }),
        expect.objectContaining({
          kind: "conditional",
          course: "MATH07005",
          source: cafiSource,
        }),
      ]),
    );
    for (const rule of rules) {
      expect(rule.url).toBe(year1.drpsUrl);
      expect([year1.notesText, ...year1.groups.map((group) => group.notesText)])
        .toEqual(expect.arrayContaining([expect.stringContaining(rule.source)]));
    }

    const prompt = String(completeMock.mock.calls[0][0]);
    expect(prompt).toContain("INFR07003");
    expect(prompt).toContain("MATH07005");
    expect(prompt).toContain("exact");
  });

  it("rejects an invented source instead of returning unsupported rules", async () => {
    completeMock.mockResolvedValue({
      rules: [
        {
          kind: "mustPassBefore",
          course: "INFR07003",
          year: 2,
          source: "Students must pass INFR07003.",
        },
      ],
    });

    await expect(extractRules(year1)).rejects.toMatchObject({
      name: "LLMError",
      code: "invalid_response",
    });
  });

  it("normalises DRPS abbreviations to the full course code", async () => {
    completeMock.mockResolvedValue({
      rules: [
        {
          kind: "mustPassBefore",
          course: "INF1-CRISP",
          year: 2,
          source: progressionSource,
        },
        {
          kind: "conditional",
          course: "CAFI",
          condition: "Required for Higher Mathematics only.",
          source: cafiSource,
        },
      ],
    });

    const rules = await extractRules(year1);

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "mustPassBefore", course: "INFR07003" }),
        expect.objectContaining({ kind: "conditional", course: "MATH07005" }),
      ]),
    );
  });

  it("restores the exact source casing when the model changes only letter case", async () => {
    const miscased = progressionSource
      .replace(/^Please note that /, "")
      .replace(/^all/, "ALL");
    completeMock.mockResolvedValue({
      rules: [
        {
          kind: "mustPassBefore",
          course: "INFR07003",
          year: 2,
          source: miscased,
        },
      ],
    });

    const rules = await extractRules(year1);

    expect(rules[0].source).toBe(
      "all students must pass Informatics 1 - Critical Skills and Practice INFR07003 (INF1-CRISP), and Informatics 1 - Foundations of Computing INFR08035 (INF1-FC) before they are allowed to progress into Year 2 of this degree.",
    );
    expect(year1.notesText).toContain(rules[0].source);
  });

  it("returns no rules when the notes contain no relevant requirement", async () => {
    completeMock.mockResolvedValue({ rules: [] });
    const empty = {
      ...year1,
      notesText: "",
      groups: year1.groups.map((group) => ({ ...group, notesText: "" })),
    };

    await expect(extractRules(empty)).resolves.toEqual([]);
  });
});
