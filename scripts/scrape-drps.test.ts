import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCreditRule, parseProgramme, programmeYearSchema } from "./scrape-drps";

const html = readFileSync(new URL("./fixtures/utcmpsi.html", import.meta.url), "utf8");
const years = parseProgramme(html, "UTCMPSI");

describe("parseCreditRule", () => {
  it("handles the DRPS phrasings", () => {
    expect(parseCreditRule("Select exactly 60 credits in this group.")).toEqual({ min: 60, max: 60 });
    expect(parseCreditRule("Select between 40 and 60 credits from X")).toEqual({ min: 40, max: 60 });
    expect(parseCreditRule("Select at least 20 credits")).toEqual({ min: 20, max: 9999 });
    expect(parseCreditRule("nothing here")).toEqual({ min: 0, max: 9999 });
  });
});

describe("parseProgramme(UTCMPSI)", () => {
  it("finds four years that validate", () => {
    expect(years.map((y) => y.year)).toEqual([1, 2, 3, 4]);
    for (const y of years) expect(() => programmeYearSchema.parse(y)).not.toThrow();
    expect(years[0].programmeTitle).toBe("Computer Science (BSc Hons)");
    expect(years[0].drpsUrl).toBe("https://www.drps.ed.ac.uk/25-26/dpt/utcmpsi.htm#dpt-year-1");
  });
  it("year 1: compulsory INF1A, INF1B, LA1 and Group A = exactly 60", () => {
    const y1 = years[0];
    expect(y1.compulsory).toEqual(["INFR08025", "INFR08029", "MATH08079"]);
    const a = y1.groups.find((g) => g.id === "A")!;
    expect(a.minCredits).toBe(60); expect(a.maxCredits).toBe(60);
    const cafi = y1.groups.find((g) => g.id === "A.1")!;
    expect(cafi.parent).toBe("A");
    expect(cafi.courses).toEqual(["MATH07005"]);
    expect(cafi.minCredits).toBe(0); expect(cafi.maxCredits).toBe(20);
    expect(cafi.notesText).toMatch(/Higher Mathematics/);
    const sched = y1.groups.find((g) => g.id === "A.2")!;
    expect(sched.schedules).toMatch(/Level 7 and 8 courses/);
    expect(sched.minCredits).toBe(40); expect(sched.maxCredits).toBe(60);
  });
  it("year 2: a bare schedule rule of exactly 20 credits", () => {
    const y2 = years[1];
    expect(y2.compulsory).toHaveLength(5);
    expect(y2.groups).toHaveLength(1);
    expect(y2.groups[0]).toMatchObject({ id: "R1", minCredits: 20, maxCredits: 20, courses: [] });
    expect(y2.groups[0].schedules).toMatch(/Level 7 and 8/);
    expect(y2.groups[0].parent).toBeUndefined();
  });
  it("captures progression prose and every course code is well-formed", () => {
    expect(years[0].notesText).toMatch(/must pass Informatics 1/);
    const codes = years.flatMap((y) => [...y.compulsory, ...y.groups.flatMap((g) => g.courses)]);
    expect(codes.length).toBeGreaterThan(40);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{4}\d{5}$/);
  });
});
