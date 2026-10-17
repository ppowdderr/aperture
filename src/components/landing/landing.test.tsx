// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LANDING_CONTENT } from "@/lib/landing-content";
import { DescribePreview } from "./DescribePreview";
import { LandingPage } from "./LandingPage";
import { PlanPreview } from "./PlanPreview";
import { RulesPreview } from "./RulesPreview";

afterEach(cleanup);

describe("LandingPage", () => {
  it("renders the complete story and both planner entry points", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: "Describe the week. Choose the legal year.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "The sequence is backwards." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Three moves, one legal year." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "What is real, and what is not." }),
    ).toBeTruthy();

    const plannerLinks = screen.getAllByRole("link", {
      name: "Open the planner",
    });
    expect(plannerLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of plannerLinks) expect(link.getAttribute("href")).toBe("/plan");
    expect(screen.getAllByRole("link", { name: "Slides" })[0]?.getAttribute("href")).toBe(
      "/slides",
    );
    expect(
      screen.getByRole("link", { name: "Create by chatting" }).getAttribute("href"),
    ).toBe("/chat");
    expect(screen.getByText("Menu")).toBeTruthy();
  });
});

describe("PlanPreview", () => {
  it("switches week requests, plans, semesters and selected courses", () => {
    render(
      <PlanPreview
        scenarios={LANDING_CONTENT.preview.hero}
        shared={LANDING_CONTENT.preview.shared}
        initialScenarioId="friday-free"
      />,
    );

    const preview = screen.getByRole("region", {
      name: LANDING_CONTENT.preview.shared.demoLabel,
    });
    expect(
      within(preview).getByRole("button", { name: "Fridays free" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");

    fireEvent.click(within(preview).getByRole("button", { name: "KB days together" }));
    expect(within(preview).getByText("No avoidable preference misses.")).toBeTruthy();

    fireEvent.click(within(preview).getByRole("tab", { name: "Plan 2" }));
    expect(within(preview).getByText("Operating Systems")).toBeTruthy();

    fireEvent.click(within(preview).getByRole("tab", { name: "S2" }));
    expect(within(preview).getAllByTitle(/Semester 2/).length).toBeGreaterThan(0);

    const course = within(preview).getByRole("button", {
      name: /Operating Systems/,
    });
    fireEvent.click(course);
    expect(course.getAttribute("aria-pressed")).toBe("true");
  });

  it("supports arrow-key plan tab navigation", () => {
    render(
      <PlanPreview
        scenarios={LANDING_CONTENT.preview.hero}
        shared={LANDING_CONTENT.preview.shared}
      />,
    );

    const firstPlan = screen.getByRole("tab", { name: "Plan 1" });
    fireEvent.keyDown(firstPlan, { key: "ArrowRight" });
    expect(
      screen.getByRole("tab", { name: "Plan 2" }).getAttribute("aria-selected"),
    ).toBe("true");
  });
});

describe("DescribePreview", () => {
  it("updates the applied constraints when an example is chosen", () => {
    render(
      <DescribePreview
        content={LANDING_CONTENT.preview.describe}
        shared={LANDING_CONTENT.preview.shared}
        brand={LANDING_CONTENT.brand.name}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Course interests" }));
    expect(screen.getByText("Interested in databases")).toBeTruthy();
    expect(screen.getByText("Interested in machine learning")).toBeTruthy();
  });
});

describe("RulesPreview", () => {
  it("exposes the DRPS source for a selected rule", () => {
    render(
      <RulesPreview
        content={LANDING_CONTENT.preview.rules}
        shared={LANDING_CONTENT.preview.shared}
      />,
    );

    const groupRule = screen.getByText("Group A").closest("details");
    expect(groupRule).toBeTruthy();
    expect(groupRule?.hasAttribute("open")).toBe(false);
    fireEvent.click(screen.getByText("Group A"));
    expect(groupRule?.hasAttribute("open")).toBe(true);
    expect(screen.getAllByText("DRPS source").length).toBeGreaterThan(1);
  });
});
