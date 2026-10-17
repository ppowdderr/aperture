// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SlidesDeck } from "./SlidesDeck";

afterEach(cleanup);

describe("SlidesDeck", () => {
  it("renders the title slide and navigation hint", () => {
    render(<SlidesDeck />);

    expect(screen.getByRole("heading", { name: "The week chooses the courses." })).toBeTruthy();
    expect(screen.getByText("← → navigate")).toBeTruthy();
    expect(screen.getByText("01 / 06")).toBeTruthy();
  });

  it("moves forward and backward with arrow keys and announces each slide", () => {
    render(<SlidesDeck />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "The controls move upstream." })).toBeTruthy();
    expect(screen.getByText("02 / 06")).toBeTruthy();
    expect(screen.getByText(/Slide 2 of 6: The controls move upstream/)).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "The week chooses the courses." })).toBeTruthy();
    expect(screen.getByText("01 / 06")).toBeTruthy();
  });

  it("stops at both ends of the six-slide deck", () => {
    render(<SlidesDeck />);

    for (let index = 0; index < 8; index += 1) {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    }
    expect(screen.getByText("06 / 06")).toBeTruthy();
    expect(screen.getByText(/Slide 6 of 6: Real enough to trust/)).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("06 / 06")).toBeTruthy();

    for (let index = 0; index < 8; index += 1) {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    }
    expect(screen.getByText("01 / 06")).toBeTruthy();
  });
});
