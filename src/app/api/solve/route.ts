import { connection } from "next/server";
import { z } from "zod";
import { loadCourses, loadProgramme, loadSlots } from "@/lib/data";
import { solve } from "@/lib/solver";
import type { Preferences, StudentState } from "@/lib/types";

const courseCode = z.string().regex(/^[A-Z]{4}\d{5}$/);
const day = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const year = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const timeBlockSchema = z
  .object({
    id: z.string().min(1),
    day,
    start: z.number().int().min(0).max(24 * 60),
    end: z.number().int().min(0).max(24 * 60),
    kind: z.enum(["free", "avoid", "prefer"]),
  })
  .strict()
  .refine((b) => b.end > b.start, { message: "end must be after start", path: ["end"] });

export const preferencesSchema = z
  .object({
    blocks: z.array(timeBlockSchema).max(200),
    maxBackToBackHours: z.number().min(0).max(12),
    maxGapHours: z.number().min(0).max(12),
    campusDaysTogether: z.boolean(),
    wantKeywords: z.array(z.string().max(80)).max(20),
    pinned: z.array(courseCode).max(20),
    excluded: z.array(courseCode).max(60),
  })
  .strict() satisfies z.ZodType<Preferences>;

export const studentSchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year,
    passed: z.array(courseCode).max(200),
    background: z.record(z.string(), z.string()),
  })
  .strict() satisfies z.ZodType<StudentState>;

export const solveRequestSchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year,
    student: studentSchema,
    preferences: preferencesSchema,
    count: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export type SolveRequest = z.infer<typeof solveRequestSchema>;

function isMissingDataFile(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return cause instanceof Error && "code" in cause && (cause as NodeJS.ErrnoException).code === "ENOENT";
}

export async function POST(request: Request): Promise<Response> {
  await connection();
  const started = performance.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = solveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid solve request", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }
  const { programmeCode, year: yearNumber, student, preferences, count } = parsed.data;

  let years, courses, slots;
  try {
    years = loadProgramme(programmeCode);
    courses = loadCourses(programmeCode);
    slots = loadSlots(programmeCode);
  } catch (error) {
    if (isMissingDataFile(error)) {
      return Response.json({ error: `Unknown programme: ${programmeCode}` }, { status: 404 });
    }
    console.error("[api/solve] data load failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Unable to load programme data" }, { status: 500 });
  }
  const programme = years.find((y) => y.year === yearNumber);
  if (!programme) {
    return Response.json({ error: `${programmeCode} has no year ${yearNumber}` }, { status: 404 });
  }

  const solutions = solve({ programme, courses, slots, allYears: years, student, preferences, count });
  const ms = Math.round(performance.now() - started);
  console.info(`[api/solve] ${programmeCode} y${yearNumber} → ${solutions.length} solutions in ${ms} ms`);
  if (solutions.length === 0) {
    return Response.json(
      { error: "No legal year matches these pins, exclusions and passed courses", solutions: [] },
      { status: 422, headers: { "Server-Timing": `solve;dur=${ms}` } },
    );
  }
  return Response.json(solutions, { headers: { "Server-Timing": `solve;dur=${ms}` } });
}
