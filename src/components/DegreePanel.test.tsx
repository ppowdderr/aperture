// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DegreePanel } from "./DegreePanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

describe("DegreePanel", () => {
  it("updates passed courses and emits StudentState", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/programmes") {
          return jsonResponse([
            {
              programmeCode: "UTCMPSI",
              programmeTitle: "Computer Science (BSc Hons)",
            },
          ]);
        }
        if (url === "/api/courses?programme=UTCMPSI") {
          return jsonResponse([
            {
              code: "INFR10086",
              title: "Algorithms and Data Structures",
              credits: 20,
              level: 10,
              semester: 2,
              school: "School of Informatics",
              prerequisitesText: "",
              drpsUrl: "https://www.drps.ed.ac.uk/26-27/dpt/cxinfr10086.htm",
            },
          ]);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      }),
    );

    render(<DegreePanel onChange={onChange} />);

    const checkbox = await screen.findByRole("checkbox", {
      name: /Algorithms and Data Structures/i,
    });
    fireEvent.click(checkbox);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("1 course · 20 credits")).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({
      programmeCode: "UTCMPSI",
      year: 3,
      passed: ["INFR10086"],
      background: {},
    });
  });

  it("shows a non-blocking error when the APIs fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    render(<DegreePanel />);

    expect(
      await screen.findByText(/Could not load programmes: offline/i),
    ).toBeTruthy();
    expect(screen.getByLabelText("Year")).toBeTruthy();
    expect(screen.getByLabelText(/Maths qualification/i)).toBeTruthy();
  });
});
