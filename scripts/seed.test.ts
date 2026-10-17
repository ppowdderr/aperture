import { describe, expect, it } from "vitest";
import type { Slot } from "../src/lib/types";
import { slotFilter } from "./seed";

describe("slotFilter", () => {
  it("uses the complete timetable row as its natural key", () => {
    const slot: Slot = {
      course: "INFR10086",
      activity: "Lecture",
      semester: 2,
      day: 0,
      start: 670,
      end: 720,
      weeks: [1, 2, 3],
      room: "Appleton Tower 2.35",
      campus: "central",
    };

    expect(slotFilter(slot)).toEqual({
      course: "INFR10086",
      activity: "Lecture",
      group: null,
      semester: 2,
      day: 0,
      start: 670,
      end: 720,
      weeks: [1, 2, 3],
      room: "Appleton Tower 2.35",
      campus: "central",
    });
  });
});
