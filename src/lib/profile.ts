import { z } from "zod";
import type { StudentState } from "./types";

export const PROFILE_KEY = "aperture:profile:v1";
export const PROFILE_VERSION = 1;

const courseCode = z.string().regex(/^[A-Z]{4}\d{5}$/);

/** What a student has to tell us once: programme, year, passed courses, background facts. */
export const profileSchema = z
  .object({
    aperture: z.literal(PROFILE_VERSION),
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    passed: z.array(courseCode).max(200),
    background: z.record(z.string(), z.string()),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;

export function toProfile(student: StudentState): Profile {
  return {
    aperture: PROFILE_VERSION,
    programmeCode: student.programmeCode,
    year: student.year,
    passed: [...student.passed].sort(),
    background: student.background,
  };
}

export function fromProfile(profile: Profile): StudentState {
  return { programmeCode: profile.programmeCode, year: profile.year, passed: profile.passed, background: profile.background };
}

/** Parses exported JSON; returns a readable error instead of throwing. */
export function parseProfile(text: string): { ok: true; student: StudentState } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't JSON." };
  }
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "profile";
    return { ok: false, error: `Not an Aperture profile (${path}: ${issue?.message ?? "invalid"}).` };
  }
  return { ok: true, student: fromProfile(parsed.data) };
}

export function loadProfile(storage: Storage | undefined = globalThis.localStorage): StudentState | null {
  try {
    const raw = storage?.getItem(PROFILE_KEY);
    if (!raw) return null;
    const r = parseProfile(raw);
    return r.ok ? r.student : null;
  } catch {
    return null;
  }
}

export function saveProfile(student: StudentState, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(PROFILE_KEY, JSON.stringify(toProfile(student)));
  } catch {
    // Private mode / quota: the profile simply doesn't persist.
  }
}

export function profileFileName(student: StudentState): string {
  return `aperture-${student.programmeCode.toLowerCase()}-year${student.year}.json`;
}

export function profileJson(student: StudentState): string {
  return JSON.stringify(toProfile(student), null, 2) + "\n";
}
