// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

afterEach(cleanup);

describe("Sheet", () => {
  it("is a labelled modal that closes from its button or Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Edit profile" onClose={onClose}>
        <button type="button">Inside</button>
      </Sheet>,
    );

    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close Edit profile" }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
