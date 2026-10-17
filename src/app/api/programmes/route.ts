import { readdirSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { ProgrammeYearModel } from "@/lib/db/models";
import { loadProgramme } from "@/lib/data";
import { programmeYearListSchema } from "@/lib/schemas";
import type { ProgrammeYear } from "@/lib/types";

function summarise(years: ProgrammeYear[]) {
  const byCode = new Map<string, { code: string; title: string; years: number }>();
  for (const year of years) {
    const current = byCode.get(year.programmeCode);
    byCode.set(year.programmeCode, {
      code: year.programmeCode,
      title: current?.title ?? year.programmeTitle,
      years: Math.max(current?.years ?? 0, year.year),
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function programmeCodesOnDisk(): string[] {
  return readdirSync(join(process.cwd(), "data"))
    .filter((name) => /^programme-[A-Z0-9]+\.json$/.test(name))
    .map((name) => name.slice("programme-".length, -".json".length));
}

export async function GET() {
  await connection();

  try {
    await connectDb();
    const years = programmeYearListSchema.parse(
      await ProgrammeYearModel.find({}, { _id: 0, __v: 0 }).lean(),
    );
    if (years.length) return Response.json(summarise(years));
  } catch {
    // The committed JSON is the offline fallback.
  }

  try {
    return Response.json(
      summarise(programmeCodesOnDisk().flatMap((code) => loadProgramme(code))),
    );
  } catch (error) {
    console.error("Unable to list programmes", error);
    return Response.json({ error: "Unable to list programmes" }, { status: 500 });
  }
}
