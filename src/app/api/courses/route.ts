import { connection } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { loadCourses, loadProgramme } from "@/lib/data";
import { CourseModel } from "@/lib/db/models";
import { courseListSchema } from "@/lib/schemas";
import type { ProgrammeYear } from "@/lib/types";

const querySchema = z.object({
  programme: z.string().trim().regex(/^[A-Za-z0-9]+$/),
});

function isMissingDataFile(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    cause instanceof Error &&
    "code" in cause &&
    (cause as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function logFallback(error: unknown): void {
  if (error instanceof Error && error.message === "MONGODB_URI missing") return;
  console.warn(
    "[api/courses] MongoDB read failed; using JSON fallback:",
    error instanceof Error ? error.message : "unknown error",
  );
}

function courseCodes(programme: ProgrammeYear[]): string[] {
  const codes = new Set<string>();
  for (const year of programme) {
    for (const code of year.compulsory) codes.add(code);
    for (const group of year.groups) {
      for (const code of group.courses) codes.add(code);
    }
  }
  return [...codes];
}

export async function GET(request: Request): Promise<Response> {
  await connection();

  const url = new URL(request.url);
  const query = querySchema.safeParse({
    programme: url.searchParams.get("programme"),
  });
  if (!query.success) {
    return Response.json(
      {
        error: "A valid programme query parameter is required",
        issues: z.treeifyError(query.error),
      },
      { status: 400 },
    );
  }

  const programmeCode = query.data.programme.toUpperCase();
  let programme: ProgrammeYear[];
  try {
    programme = loadProgramme(programmeCode);
  } catch (error) {
    if (isMissingDataFile(error)) {
      return Response.json(
        { error: `Unknown programme: ${programmeCode}` },
        { status: 404 },
      );
    }
    console.error(
      "[api/courses] programme fallback failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json(
      { error: "Unable to load programme" },
      { status: 500 },
    );
  }

  let rows: unknown[] = [];
  try {
    await connectDb();
    rows = await CourseModel.find({
      code: { $in: courseCodes(programme) },
    })
      .select({ _id: 0, __v: 0 })
      .sort({ code: 1 })
      .lean()
      .exec();
  } catch (error) {
    logFallback(error);
  }

  if (rows.length > 0) {
    const parsed = courseListSchema.safeParse(rows);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid course data in MongoDB",
          issues: z.treeifyError(parsed.error),
        },
        { status: 500 },
      );
    }
    return Response.json(parsed.data);
  }

  try {
    return Response.json(courseListSchema.parse(loadCourses(programmeCode)));
  } catch (error) {
    console.error(
      "[api/courses] JSON fallback failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json(
      { error: "Unable to load courses" },
      { status: 500 },
    );
  }
}
