import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCourses, loadProgramme } from "@/lib/data";
import { applyPatch, parseWithDeepSeek, systemPrompt } from "@/lib/parse";
import { preferencesSchema } from "../solve/route";

const bodySchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year: z.number().int().min(1).max(5),
    message: z.string().min(1).max(1000),
    preferences: preferencesSchema,
  })
  .strict();

/** POST /api/parse — one chat message → updated preferences + a short reply. */
export async function POST(req: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const { programmeCode, year, message, preferences } = parsed.data;
  const [programme, courses] = await Promise.all([loadProgramme(programmeCode), loadCourses(programmeCode)]);
  const py = programme?.find((y) => y.year === year);
  if (!py) return NextResponse.json({ error: "Unknown programme or year" }, { status: 404 });
  const allowed = new Set([...py.compulsory, ...py.groups.flatMap((g) => g.courses)]);
  const inYear = courses.filter((c) => allowed.has(c.code) || c.level >= 9);
  const t0 = performance.now();
  try {
    const patch = await parseWithDeepSeek(message, systemPrompt(year, inYear, preferences));
    if (!patch) return NextResponse.json({ error: "I couldn't turn that into settings. Try naming days, times or courses." }, { status: 422 });
    return NextResponse.json(
      { preferences: applyPatch(preferences, patch), reply: patch.reply, notes: patch.notes ?? [] },
      { headers: { "Server-Timing": `parse;dur=${Math.round(performance.now() - t0)}` } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Parser unavailable" }, { status: 502 });
  }
}
