import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  courseListSchema,
  programmeYearListSchema,
  slotListSchema,
} from "./schemas";
import type { Course, ProgrammeYear, Slot } from "./types";

function loadJson<T>(filename: string, schema: z.ZodType<T>): T {
  const file = join(process.cwd(), "data", filename);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`Unable to read data/${filename}`, { cause: error });
  }

  const result = schema.safeParse(JSON.parse(raw));

  if (!result.success) {
    throw new Error(`Invalid ${filename}: ${z.prettifyError(result.error)}`, {
      cause: result.error,
    });
  }

  return result.data;
}

function normaliseCode(code: string): string {
  const value = code.trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(value)) throw new Error(`invalid code: ${code}`);
  return value;
}

export function loadProgramme(code: string): ProgrammeYear[] {
  const value = normaliseCode(code);
  return loadJson(`programme-${value}.json`, programmeYearListSchema);
}

export function loadCourses(code: string): Course[] {
  const value = normaliseCode(code);
  return loadJson(`courses-${value}.json`, courseListSchema);
}

export function loadSlots(code: string): Slot[] {
  const value = normaliseCode(code);
  return loadJson(`slots-${value}.json`, slotListSchema);
}
