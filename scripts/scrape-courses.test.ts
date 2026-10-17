import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCourseHtml,
  isDelivered,
  parseCourse,
  programmeCourseCodes,
} from "./scrape-courses";
import type { ProgrammeYear } from "../src/lib/types";

const html = readFileSync(
  new URL("./fixtures/cxinfr10086.html", import.meta.url),
  "utf8",
);

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("parseCourse", () => {
  it("parses the current Machine Learning catalogue page", () => {
    expect(parseCourse(html, "INFR10086")).toEqual({
      code: "INFR10086",
      title: "Machine Learning",
      credits: 20,
      level: 10,
      semester: 2,
      school: "School of Informatics",
      prerequisitesText:
        "Students MUST have passed: Informatics 2 - Foundations of Data Science (INFR08030)",
      drpsUrl: "https://www.drps.ed.ac.uk/26-27/dpt/cxinfr10086.htm",
    });
  });

  it("rejects a fixture for a different course", () => {
    expect(() => parseCourse(html, "INFR08029")).toThrow(
      "expected INFR08029, found INFR10086",
    );
  });
});

describe("isDelivered", () => {
  it("detects courses without an active delivery row", () => {
    expect(isDelivered(html)).toBe(true);
    expect(isDelivered("<table><tr><td>Not being delivered</td></tr></table>")).toBe(
      false,
    );
  });
});

describe("programmeCourseCodes", () => {
  it("returns sorted unique explicit course codes", () => {
    const programme = [
      {
        programmeCode: "X",
        programmeTitle: "X",
        year: 1,
        compulsory: ["INFR10086", "MATH08079"],
        groups: [
          {
            id: "A",
            title: "A",
            minCredits: 20,
            maxCredits: 20,
            courses: ["MATH08079", "INFR07003"],
            notesText: "",
          },
        ],
        notesText: "",
        drpsUrl: "https://example.com",
      },
    ] satisfies ProgrammeYear[];

    expect(programmeCourseCodes(programme)).toEqual([
      "INFR07003",
      "INFR10086",
      "MATH08079",
    ]);
  });
});

describe("getCourseHtml", () => {
  it("reuses cached HTML without making another request", async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), "aperture-course-cache-"));
    temporaryDirectories.push(cacheDir);
    const fetchImpl = vi.fn(async () => new Response(html, { status: 200 }));

    await expect(
      getCourseHtml("INFR10086", { cacheDir, fetchImpl, delayMs: 0 }),
    ).resolves.toBe(html);
    await expect(
      getCourseHtml("INFR10086", {
        cacheDir,
        fetchImpl: async () => {
          throw new Error("cache miss");
        },
        delayMs: 0,
      }),
    ).resolves.toBe(html);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
