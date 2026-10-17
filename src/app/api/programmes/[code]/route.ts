import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { ProgrammeYearModel } from "@/lib/db/models";
import { loadProgramme } from "@/lib/data";
import { programmeYearListSchema } from "@/lib/schemas";

interface Context {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, { params }: Context) {
  await connection();
  const code = (await params).code.trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) {
    return Response.json({ error: "Invalid programme code" }, { status: 400 });
  }

  try {
    await connectDb();
    const years = programmeYearListSchema.parse(
      await ProgrammeYearModel.find(
        { programmeCode: code },
        { _id: 0, __v: 0 },
      ).lean(),
    );
    if (years.length) return Response.json(years);
  } catch {
    // Fall through to the committed data.
  }

  try {
    return Response.json(loadProgramme(code));
  } catch (error) {
    const missing =
      error instanceof Error && error.message.startsWith("Unable to read data/");
    return Response.json(
      { error: missing ? "Programme not found" : "Invalid programme data" },
      { status: missing ? 404 : 500 },
    );
  }
}
