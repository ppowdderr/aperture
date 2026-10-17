// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "@/lib/types";
import { AskBar, mergePreferences } from "./AskBar";
import { emptyPreferences } from "./WeekGrid";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function Harness({ onChange }: { onChange: (next: Preferences) => void }) {
  const [value, setValue] = useState(emptyPreferences);
  return (
    <AskBar
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("AskBar", () => {
  it("applies parsed blocks and reports the change", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          blocks: [
            { id: "ask-1", day: 4, start: 480, end: 1080, kind: "free" },
            { id: "ask-2", day: 0, start: 540, end: 600, kind: "free" },
            { id: "ask-3", day: 1, start: 540, end: 600, kind: "free" },
          ],
          campusDaysTogether: true,
          wantKeywords: ["databases"],
        }),
      ),
    );

    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("What you want, in your own words"), {
      target: { value: "No 9ams Monday or Tuesday, Friday off, databases" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next = onChange.mock.lastCall?.[0] as Preferences;
    expect(next.blocks).toHaveLength(3);
    expect(next.campusDaysTogether).toBe(true);
    expect(next.wantKeywords).toEqual(["databases"]);
    expect(screen.getByRole("status").textContent).toContain("Applied");
  });

  it("keeps preferences unchanged when the parser rejects the sentence", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          { error: "I couldn't find a timetable preference in that sentence." },
          422,
        ),
      ),
    );

    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("What you want, in your own words"), {
      target: { value: "The weather is nice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "couldn't find",
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("mergePreferences", () => {
  it("overrides overlapping blocks and preserves pins and exclusions", () => {
    const current: Preferences = {
      ...emptyPreferences(),
      blocks: [{ id: "old", day: 0, start: 480, end: 1080, kind: "avoid" }],
      pinned: ["INFR10086"],
      excluded: ["INFR08030"],
    };
    const next = mergePreferences(current, {
      blocks: [{ id: "new", day: 0, start: 540, end: 600, kind: "free" }],
    });

    expect(next.blocks).toHaveLength(3);
    expect(next.blocks[0]).toMatchObject({
      id: "old",
      day: 0,
      start: 480,
      end: 540,
      kind: "avoid",
    });
    expect(next.blocks[1]).toMatchObject({
      id: "new",
      day: 0,
      start: 540,
      end: 600,
      kind: "free",
    });
    expect(next.blocks[2]).toMatchObject({
      day: 0,
      start: 600,
      end: 1080,
      kind: "avoid",
    });
    expect(next.pinned).toEqual(["INFR10086"]);
    expect(next.excluded).toEqual(["INFR08030"]);
  });
});
