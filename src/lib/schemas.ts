import { z } from "zod";
import type {
  Course,
  OptionGroup,
  ProgrammeYear,
  Rule,
  Slot,
} from "./types";

export const semesterSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal("full"),
]);

export const courseSchema = z
  .object({
    code: z.string().regex(/^[A-Z]{4}\d{5}$/),
    title: z.string().min(1),
    credits: z.number().int().nonnegative(),
    level: z.number().int().min(7).max(12),
    semester: semesterSchema,
    school: z.string().min(1),
    prerequisitesText: z.string(),
    drpsUrl: z.string().url(),
  })
  .strict() satisfies z.ZodType<Course>;

export const optionGroupSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    minCredits: z.number().int().nonnegative(),
    maxCredits: z.number().int().nonnegative(),
    courses: z.array(z.string().regex(/^[A-Z]{4}\d{5}$/)),
    schedules: z.string().optional(),
    notesText: z.string(),
    parent: z.string().min(1).optional(),
  })
  .strict() satisfies z.ZodType<OptionGroup>;

export const programmeYearSchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    programmeTitle: z.string().min(1),
    year: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    compulsory: z.array(z.string().regex(/^[A-Z]{4}\d{5}$/)),
    groups: z.array(optionGroupSchema),
    notesText: z.string(),
    drpsUrl: z.string().url(),
  })
  .strict() satisfies z.ZodType<ProgrammeYear>;

export const slotSchema = z
  .object({
    course: z.string().regex(/^[A-Z]{4}\d{5}$/),
    activity: z.string().min(1),
    group: z.string().min(1).optional(),
    semester: z.union([z.literal(1), z.literal(2)]),
    day: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    start: z.number().int().min(0).max(1440),
    end: z.number().int().min(0).max(1440),
    weeks: z.array(z.number().int().min(1).max(11)),
    room: z.string(),
    campus: z.union([
      z.literal("central"),
      z.literal("kb"),
      z.literal("other"),
    ]),
  })
  .strict()
  .refine((slot) => slot.end > slot.start, {
    message: "end must be after start",
    path: ["end"],
  }) satisfies z.ZodType<Slot>;

export const ruleSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("compulsory"),
      course: z.string(),
      source: z.string(),
      url: z.string().url(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("creditRange"),
      group: z.string(),
      min: z.number(),
      max: z.number(),
      source: z.string(),
      url: z.string().url(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("prerequisite"),
      course: z.string(),
      requires: z.array(z.string()),
      source: z.string(),
      url: z.string().url(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("mustPassBefore"),
      course: z.string(),
      year: z.number(),
      source: z.string(),
      url: z.string().url(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("conditional"),
      course: z.string(),
      condition: z.string(),
      source: z.string(),
      url: z.string().url(),
    })
    .strict(),
]) satisfies z.ZodType<Rule>;

export const courseListSchema = z.array(courseSchema);
export const programmeYearListSchema = z.array(programmeYearSchema);
export const slotListSchema = z.array(slotSchema);
