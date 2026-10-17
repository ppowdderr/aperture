import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { SlotModel } from "@/lib/db/models";
import { loadProgramme, loadSlots } from "@/lib/data";
import { slotListSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  await connection();
  const code = new URL(request.url).searchParams.get("programme")?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9]+$/.test(code)) {
    return Response.json({ error: "programme query parameter required" }, { status: 400 });
  }

  let programme;
  try {
    programme = loadProgramme(code);
  } catch (error) {
    const missing =
      error instanceof Error && error.message.startsWith("Unable to read data/");
    return Response.json(
      { error: missing ? "Programme not found" : "Invalid programme data" },
      { status: missing ? 404 : 500 },
    );
  }

  const courseCodes = [
    ...new Set(
      programme.flatMap((year) => [
        ...year.compulsory,
        ...year.groups.flatMap((group) => group.courses),
      ]),
    ),
  ];

  try {
    await connectDb();
    const slots = slotListSchema.parse(
      await SlotModel.find(
        { course: { $in: courseCodes } },
        { _id: 0, __v: 0 },
      )
        .sort({ course: 1, semester: 1, day: 1, start: 1 })
        .lean(),
    );
    if (slots.length) return Response.json(slots);
  } catch {
    // Fall through to the committed data.
  }

  try {
    return Response.json(loadSlots(code));
  } catch {
    return Response.json({ error: "Timetable data not found" }, { status: 404 });
  }
}
