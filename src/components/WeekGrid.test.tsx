// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Preferences, TimeBlock } from "@/lib/types";
import { WeekGrid, emptyPreferences, placeBlock } from "./WeekGrid";

// 5 columns × 100 px, 10 hours × 60 px, origin at (0, 0).
const RECT = { left: 0, top: 0, width: 500, height: 600, right: 500, bottom: 600, x: 0, y: 0, toJSON: () => ({}) };
const at = (day: number, hour: number) => ({ clientX: day * 100 + 50, clientY: (hour - 8) * 60 });

const onChange = vi.fn<(p: Preferences) => void>();
function Harness() {
  const [prefs, setPrefs] = useState(emptyPreferences);
  return <WeekGrid value={prefs} onChange={(p) => { setPrefs(p); onChange(p); }} />;
}
const latest = new Proxy({} as Preferences, { get: (_, k) => (onChange.mock.lastCall?.[0] ?? emptyPreferences())[k as keyof Preferences] });
const canvas = () => screen.getByRole("group", { name: "Week" });
const drag = (from: ReturnType<typeof at>, to: ReturnType<typeof at>) => {
  fireEvent.pointerDown(canvas(), { button: 0, ...from });
  fireEvent.pointerMove(window, to);
  fireEvent.pointerUp(window, to);
};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(RECT as DOMRect);
  onChange.mockClear();
  render(<Harness />);
});
afterEach(cleanup);

describe("WeekGrid", () => {
  it("drag down a column creates a Keep-free block spanning it", () => {
    drag(at(4, 9), at(4, 18));
    expect(latest.blocks).toMatchObject([{ day: 4, start: 540, end: 1080, kind: "free" }]);
    expect(screen.getByRole("button", { name: "Keep free, Friday 09:00 to 18:00" })).toBeTruthy();
  });

  it("a click without movement creates a one-hour block", () => {
    drag(at(1, 10), at(1, 10));
    expect(latest.blocks).toMatchObject([{ day: 1, start: 600, end: 660 }]);
  });

  it("clicking a block opens the type popover; choosing Prefer changes it; Remove deletes it", () => {
    drag(at(0, 9), at(0, 11));
    const block = screen.getByRole("button", { name: /Keep free, Monday/ });
    fireEvent.pointerDown(block, { button: 0, ...at(0, 9) });
    fireEvent.pointerUp(window, at(0, 9));
    expect(screen.getByRole("dialog").textContent).toContain("Avoid");
    fireEvent.click(screen.getByRole("radio", { name: /Prefer/ }));
    expect(latest.blocks[0].kind).toBe("prefer");
    expect(screen.getByText("Prefer")).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("button", { name: /Prefer, Monday/ }), { button: 0, ...at(0, 9) });
    fireEvent.pointerUp(window, at(0, 9));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(latest.blocks).toEqual([]);
  });

  it("works from the keyboard: arrows move the caret, Enter marks an hour, arrows move the block, Delete removes", () => {
    const c = canvas();
    c.focus();
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "ArrowDown" });
    fireEvent.keyDown(c, { key: "Enter" });
    expect(latest.blocks).toMatchObject([{ day: 1, start: 600, end: 660, kind: "free" }]);
    const block = screen.getByRole("button", { name: /Keep free, Tuesday 10:00/ });
    fireEvent.keyDown(block, { key: "ArrowDown" });
    fireEvent.keyDown(block, { key: "ArrowRight" });
    fireEvent.keyDown(block, { key: "ArrowDown", shiftKey: true });
    expect(latest.blocks).toMatchObject([{ day: 2, start: 660, end: 780 }]);
    fireEvent.keyDown(screen.getByRole("button", { name: /Wednesday/ }), { key: "Delete" });
    expect(latest.blocks).toEqual([]);
  });

  it("Cmd+Z undoes the last change", () => {
    drag(at(2, 9), at(2, 12));
    drag(at(3, 9), at(3, 12));
    expect(latest.blocks).toHaveLength(2);
    fireEvent.keyDown(canvas(), { key: "z", metaKey: true });
    expect(latest.blocks).toHaveLength(1);
  });

  it("every block is labelled by text, not colour alone", () => {
    drag(at(0, 9), at(0, 10));
    expect(screen.getByRole("button", { name: /Keep free/ }).textContent).toContain("Free");
  });

  it("controls write through to preferences", () => {
    fireEvent.change(screen.getByLabelText("Longest gap (hours)"), { target: { value: "1" } });
    fireEvent.click(screen.getByLabelText("Keep each campus to its own days"));
    expect(latest.maxGapHours).toBe(1);
    expect(latest.campusDaysTogether).toBe(true);
  });
});

describe("placeBlock", () => {
  const b = (id: string, day: TimeBlock["day"], s: number, e: number): TimeBlock => ({ id, day, start: s * 60, end: e * 60, kind: "free" });
  it("trims, splits and replaces overlapping blocks on the same day only", () => {
    const out = placeBlock([b("a", 0, 9, 17), b("x", 1, 9, 17)], b("n", 0, 11, 13));
    expect(out.map((o) => [o.day, o.start / 60, o.end / 60])).toEqual([[0, 9, 11], [0, 11, 13], [0, 13, 17], [1, 9, 17]]);
    expect(placeBlock([b("a", 0, 10, 12)], b("n", 0, 9, 13)).map((o) => o.id)).toEqual(["n"]);
  });
});
