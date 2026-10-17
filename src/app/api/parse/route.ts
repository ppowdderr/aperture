import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCourses, loadProgramme } from "@/lib/data";
import { applyPatch, checkTake, parseMessage, systemPrompt } from "@/lib/parse";
import { placeableCourses } from "@/lib/solver/search";
import { preferencesSchema, studentSchema } from "../solve/route";

const bodySchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year: z.number().int().min(1).max(5),
    message: z.string().min(1).max(1000),
    preferences: preferencesSchema,
    student: studentSchema.optional(),
    history: z.array(z.object({ role: z.enum(["you", "aperture"]), text: z.string().max(1000) })).max(20).optional(),
  })
  .strict();

/** POST /api/parse — one chat message → updated preferences + a short reply. */
export async function POST(req: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const { programmeCode, year, message, preferences, history = [] } = parsed.data;
  const [programme, courses] = await Promise.all([loadProgramme(programmeCode), loadCourses(programmeCode)]);
  const py = programme?.find((y) => y.year === year);
  if (!py) return NextResponse.json({ error: "Unknown programme or year" }, { status: 404 });
  const student = parsed.data.student ?? { programmeCode, year: py.year, passed: [], background: {} };
  const { placeable, reasonNot } = placeableCourses({ programme: py, courses, student, allYears: programme });
  const inYear = courses.filter((c) => placeable.has(c.code));
  const titles = new Map(courses.map((c) => [c.code, c.title]));
  const t0 = performance.now();
  try {
    const patch = checkTake(
      await parseMessage(message, systemPrompt(year, inYear, preferences), history),
      placeable,
      reasonNot,
      titles,
    );
    return NextResponse.json(
      { preferences: applyPatch(preferences, patch), reply: patch.reply, notes: patch.notes ?? [] },
      { headers: { "Server-Timing": `parse;dur=${Math.round(performance.now() - t0)}` } },
    );
  } catch (e) {
    console.error(
      "[api/parse] failed:",
      e instanceof Error ? `${e.name}: ${e.message}` : "unknown error",
    );
    return NextResponse.json({ error: e instanceof Error ? e.message : "Parser unavailable" }, { status: 502 });
  }
}
