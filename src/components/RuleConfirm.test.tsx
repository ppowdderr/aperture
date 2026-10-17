// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Rule, StudentState } from "@/lib/types";
import { RuleConfirm } from "./RuleConfirm";

const sourceA =
  "Please note that all students must pass Informatics 1 - Critical Skills and Practice INFR07003 (INF1-CRISP), and Informatics 1 - Foundations of Computing INFR08035 (INF1-FC) before they are allowed to progress into Year 2 of this degree.";
const sourceB =
  "Calculus and Algebra for Informatics MATH07005 (CAFI) is required for students with Higher Mathematics only, or Advanced Higher less than Grade A, or A-level Mathematics less than Grade A, or equivalent.";
const url = "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-1";
const rules: Rule[] = [
  {
    kind: "mustPassBefore",
    course: "INFR07003",
    year: 2,
    source: sourceA,
    url,
  },
  {
    kind: "mustPassBefore",
    course: "INFR08035",
    year: 2,
    source: sourceA,
    url,
  },
  {
    kind: "conditional",
    course: "MATH07005",
    condition:
      "Required for Higher Mathematics only, Advanced Higher below Grade A, A-level Mathematics below Grade A, or equivalent.",
    source: sourceB,
    url,
  },
];
const student: StudentState = {
  programmeCode: "UTCMPSI",
  year: 1,
  passed: [],
  background: {},
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RuleConfirm", () => {
  it("shows source evidence and omits rejected rules from confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ rules })));
    const onConfirm = vi.fn();
    render(
      <RuleConfirm
        programmeCode="UTCMPSI"
        year={1}
        student={student}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read rules from notes" }));
    expect(await screen.findByText(/INFR07003 before Year 2/i)).toBeTruthy();
    expect(screen.getAllByText(sourceA).length).toBeGreaterThan(0);
    expect(screen.getByText(sourceB)).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: /INFR08035 before Year 2/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm selected rules" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const confirmed = onConfirm.mock.lastCall?.[0] as Rule[];
    expect(confirmed).toHaveLength(2);
    expect(confirmed.some((rule) => rule.kind === "mustPassBefore" && rule.course === "INFR08035")).toBe(false);
    expect(confirmed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "conditional", course: "MATH07005" }),
      ]),
    );
  });

  it("lets the student edit an extracted condition before confirming", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ rules: [rules[2]] })),
    );
    const onConfirm = vi.fn();
    render(
      <RuleConfirm
        programmeCode="UTCMPSI"
        year={1}
        student={student}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read rules from notes" }));
    const condition = await screen.findByLabelText("Condition for MATH07005");
    fireEvent.change(condition, { target: { value: "Only for Higher Mathematics." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm selected rules" }));

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: "conditional",
        course: "MATH07005",
        condition: "Only for Higher Mathematics.",
      }),
    ]);
  });

  it("blocks confirmation when a must-pass rule is already unmet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ rules: [rules[0]] })),
    );
    const onConfirm = vi.fn();
    render(
      <RuleConfirm
        programmeCode="UTCMPSI"
        year={2}
        student={{ ...student, year: 2 }}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read rules from notes" }));
    await screen.findByText(/INFR07003 before Year 2/i);
    fireEvent.click(screen.getByRole("button", { name: "Confirm selected rules" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain(
      "Mark INFR07003 as passed",
    );
  });

  it("shows a one-line error when extraction is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({ error: "The rule extractor is unavailable." }, 502),
      ),
    );
    render(
      <RuleConfirm
        programmeCode="UTCMPSI"
        year={1}
        student={student}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read rules from notes" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "rule extractor is unavailable",
      ),
    );
  });
});
