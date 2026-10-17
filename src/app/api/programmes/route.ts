import { readdirSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import { z } from "zod";
import { loadProgramme } from "@/lib/data";
import { ProgrammeYearModel } from "@/lib/db/models";

const programmeSummarySchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    programmeTitle: z.string().min(1),
  })
  .strict();

const programmeSummaryListSchema = z.array(programmeSummarySchema);
type ProgrammeSummary = z.infer<typeof programmeSummarySchema>;

function logFallback(error: unknown): void {
  if (error instanceof Error && error.message === "MONGODB_URI missing") return;
  console.warn(
    "[api/programmes] MongoDB read failed; using JSON fallback:",
    error instanceof Error ? error.message : "unknown error",
  );
}

function loadFallback(): ProgrammeSummary[] {
  const dataDirectory = join(process.cwd(), "data");
  const codes = readdirSync(dataDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.match(/^programme-([A-Z0-9]+)\.json$/)?.[1])
    .filter((code): code is string => Boolean(code))
    .sort();

  return codes.map((code) => {
    const years = loadProgramme(code);
    const first = years[0];
    if (!first) throw new Error(`No programme years in programme-${code}.json`);
    return {
      programmeCode: first.programmeCode,
      programmeTitle: first.programmeTitle,
    };
  });
}

export async function GET(): Promise<Response> {
  await connection();

  let rows: Array<{ programmeCode: string; programmeTitle: string }> = [];
  try {
    rows = await ProgrammeYearModel.find()
      .select({ programmeCode: 1, programmeTitle: 1, _id: 0 })
      .sort({ programmeCode: 1, year: 1 })
      .lean<Array<{ programmeCode: string; programmeTitle: string }>>()
      .exec();
  } catch (error) {
    logFallback(error);
  }

  if (rows.length > 0) {
    const unique = new Map<string, ProgrammeSummary>();
    for (const row of rows) {
      unique.set(row.programmeCode, {
        programmeCode: row.programmeCode,
        programmeTitle: row.programmeTitle,
      });
    }

    const parsed = programmeSummaryListSchema.safeParse([...unique.values()]);
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
    return Response.json(programmeSummaryListSchema.parse(loadFallback()));
  } catch (error) {
    console.error(
      "[api/programmes] JSON fallback failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json(
      { error: "Unable to load programmes" },
      { status: 500 },
    );
  }
}
