// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "@/lib/types";
import { emptyPreferences } from "./WeekGrid";
import { PreferencesSettings } from "./PreferencesSettings";

afterEach(() => {
  cleanup();
});

function Harness({ onChange }: { onChange: (next: Preferences) => void }) {
  const [value, setValue] = useState(emptyPreferences);
  return (
    <PreferencesSettings
      value={value}
      courses={[]}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("PreferencesSettings", () => {
  it("adds a whole Wednesday off and immediately emits the new preference", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "No classes on Wednesday" }));

    const next = onChange.mock.lastCall?.[0] as Preferences;
    expect(next.blocks).toEqual([
      expect.objectContaining({ day: 2, start: 480, end: 1080, kind: "free" }),
    ]);
    expect(
      (screen.getByRole("checkbox", { name: "No classes on Wednesday" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("applies a no-9am start and can remove the resulting manual rule", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "No classes on Wednesday" }));
    fireEvent.change(screen.getByLabelText("No classes before"), {
      target: { value: "600" },
    });

    expect((onChange.mock.lastCall?.[0] as Preferences).earliestStart).toBe(600);

    fireEvent.click(screen.getByRole("button", { name: "Remove: Wed all day free" }));

    const next = onChange.mock.lastCall?.[0] as Preferences;
    expect(next.blocks).toEqual([]);
    expect(next.earliestStart).toBe(600);
  });
});
