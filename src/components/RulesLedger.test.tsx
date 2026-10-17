// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Rule } from "../lib/types";
import { formatRule, RulesLedger } from "./RulesLedger";

afterEach(cleanup);

const url = "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm";

describe("formatRule", () => {
  it("phrases compulsory rules", () => {
    expect(
      formatRule({
        kind: "compulsory",
        course: "INFR08030",
        source: "Compulsory course.",
        url,
      }),
    ).toBe("You must take INFR08030.");
  });

  it("phrases credit ranges", () => {
    expect(
      formatRule({
        kind: "creditRange",
        group: "A",
        min: 40,
        max: 60,
        source: "Select between 40 and 60 credits.",
        url,
      }),
    ).toBe("Choose between 40 and 60 credits from Group A.");
  });

  it("phrases prerequisites", () => {
    expect(
      formatRule({
        kind: "prerequisite",
        course: "INFR10086",
        requires: ["INFR08030", "INFR08031"],
        source: "Prerequisites: INFR08030 and INFR08031.",
        url,
      }),
    ).toBe("INFR10086 requires INFR08030, INFR08031.");
  });

  it("phrases progression rules", () => {
    expect(
      formatRule({
        kind: "mustPassBefore",
        course: "INFR08030",
        year: 2,
        source: "Must pass before Year 2.",
        url,
      }),
    ).toBe("Pass INFR08030 before Year 2.");
  });

  it("phrases conditional rules", () => {
    expect(
      formatRule({
        kind: "conditional",
        course: "MATH08057",
        condition: "Higher Mathematics is the student's only maths qualification",
        source: "Required for students with Higher Mathematics only.",
        url,
      }),
    ).toBe(
      "Take MATH08057 only when: Higher Mathematics is the student's only maths qualification.",
    );
  });
});

describe("RulesLedger", () => {
  it("groups rules, shows exact sources and opens DRPS links in a new tab", () => {
    const rules: Rule[] = [
      {
        kind: "compulsory",
        course: "INFR08030",
        source: "This course is compulsory.",
        url,
      },
      {
        kind: "creditRange",
        group: "A",
        min: 60,
        max: 60,
        source: "Select exactly 60 credits in this group.",
        url,
      },
    ];

    render(<RulesLedger rules={rules} />);

    expect(screen.getByText("Compulsory courses")).toBeTruthy();
    expect(screen.getByText("Credit ranges")).toBeTruthy();
    expect(screen.getByText("You must take INFR08030.")).toBeTruthy();
    expect(screen.getByText("Choose exactly 60 credits from Group A.")).toBeTruthy();
    expect(screen.getByTitle("This course is compulsory.")).toBeTruthy();

    const links = screen.getAllByRole("link", { name: "DRPS source ↗" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(url);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
  });

  it("renders a quiet empty state", () => {
    render(<RulesLedger rules={[]} />);
    expect(screen.getByText("No rules recorded for this solution.")).toBeTruthy();
  });
});
