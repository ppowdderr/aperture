// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { StudentState } from "./types";
import { PROFILE_KEY, loadProfile, parseProfile, profileFileName, profileJson, saveProfile } from "./profile";

const student: StudentState = { programmeCode: "UTCMPSI", year: 3, passed: ["INFR08027", "INFR08026"], background: { maths: "A-level A*" } };

beforeEach(() => localStorage.clear());

describe("profile", () => {
  it("round-trips through JSON text and localStorage, sorting passed courses", () => {
    const text = profileJson(student);
    expect(JSON.parse(text)).toEqual({ aperture: 1, programmeCode: "UTCMPSI", year: 3, passed: ["INFR08026", "INFR08027"], background: { maths: "A-level A*" } });
    const r = parseProfile(text);
    expect(r).toEqual({ ok: true, student: { ...student, passed: ["INFR08026", "INFR08027"] } });
    saveProfile(student);
    expect(loadProfile()).toEqual({ ...student, passed: ["INFR08026", "INFR08027"] });
    expect(profileFileName(student)).toBe("aperture-utcmpsi-year3.json");
  });

  it("rejects junk with a readable reason", () => {
    expect(parseProfile("{nope")).toEqual({ ok: false, error: "That file isn't JSON." });
    const r = parseProfile(JSON.stringify({ aperture: 1, programmeCode: "UTCMPSI", year: 9, passed: [], background: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Not an Aperture profile \(year: /);
    expect(parseProfile(JSON.stringify({ hello: 1 })).ok).toBe(false);
    localStorage.setItem(PROFILE_KEY, "garbage");
    expect(loadProfile()).toBeNull();
    expect(loadProfile(undefined)).toBeNull();
  });

  it("round-trips confirmed degree rules", () => {
    const rule = {
      kind: "mustPassBefore" as const,
      course: "INFR07003",
      year: 2,
      source: "Students must pass INFR07003 before Year 2.",
      url: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-1",
    };
    const withRules: StudentState = { ...student, confirmedRules: [rule] };

    const parsed = parseProfile(profileJson(withRules));

    expect(parsed).toEqual({ ok: true, student: { ...withRules, passed: ["INFR08026", "INFR08027"] } });
    expect(JSON.parse(profileJson(withRules)).confirmedRules).toEqual([rule]);
  });
});
