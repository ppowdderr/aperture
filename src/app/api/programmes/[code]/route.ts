import { connection } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { loadProgramme } from "@/lib/data";
import { ProgrammeYearModel } from "@/lib/db/models";
import { programmeYearListSchema } from "@/lib/schemas";

interface RouteContext {
  params: Promise<{ code: string }>;
}

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
    "[api/programmes/:code] MongoDB read failed; using JSON fallback:",
    error instanceof Error ? error.message : "unknown error",
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  await connection();

  const programmeCode = (await context.params).code.trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(programmeCode)) {
    return Response.json(
      { error: "Invalid programme code" },
      { status: 400 },
    );
  }

  let rows: unknown[] = [];
  try {
    await connectDb();
    rows = await ProgrammeYearModel.find({ programmeCode })
      .select({ _id: 0, __v: 0 })
      .sort({ year: 1 })
      .lean()
      .exec();
  } catch (error) {
    logFallback(error);
  }

  if (rows.length > 0) {
    const parsed = programmeYearListSchema.safeParse(rows);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid programme data in MongoDB",
          issues: z.treeifyError(parsed.error),
        },
        { status: 500 },
      );
    }
    return Response.json(parsed.data);
  }

  try {
    return Response.json(programmeYearListSchema.parse(loadProgramme(programmeCode)));
  } catch (error) {
    if (isMissingDataFile(error)) {
      return Response.json(
        { error: `Unknown programme: ${programmeCode}` },
        { status: 404 },
      );
    }
    console.error(
      "[api/programmes/:code] JSON fallback failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json(
      { error: "Unable to load programme" },
      { status: 500 },
    );
  }
}
