import { existsSync } from "node:fs";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import {
  CourseModel,
  ProgrammeYearModel,
  RuleModel,
  SlotModel,
} from "../src/lib/db/models";
import { loadCourses, loadProgramme, loadSlots } from "../src/lib/data";
import type { Slot } from "../src/lib/types";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/** Stable identity for a timetable row; Rule slots have no database id in the domain type. */
export function slotFilter(slot: Slot) {
  return {
    course: slot.course,
    activity: slot.activity,
    group: slot.group ?? null,
    semester: slot.semester,
    day: slot.day,
    start: slot.start,
    end: slot.end,
    weeks: slot.weeks,
    room: slot.room,
    campus: slot.campus,
  };
}

async function seed(programmeCode: string) {
  const programme = loadProgramme(programmeCode);
  const courses = loadCourses(programmeCode);
  const slots = loadSlots(programmeCode);
  const courseCodes = new Set(courses.map((course) => course.code));
  const orphanedSlots = slots.filter((slot) => !courseCodes.has(slot.course));
  if (orphanedSlots.length) {
    throw new Error(
      `${orphanedSlots.length} slots reference courses absent from courses-${programmeCode}.json`,
    );
  }

  await connectDb();
  await Promise.all([
    ProgrammeYearModel.init(),
    CourseModel.init(),
    SlotModel.init(),
    RuleModel.init(),
  ]);

  const programmeResult = await ProgrammeYearModel.bulkWrite(
    programme.map((year) => ({
      updateOne: {
        filter: { programmeCode: year.programmeCode, year: year.year },
        update: { $set: year },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  const courseResult = await CourseModel.bulkWrite(
    courses.map((course) => ({
      updateOne: {
        filter: { code: course.code },
        update: { $set: course },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  const slotResult = await SlotModel.bulkWrite(
    slots.map((slot) => ({
      updateOne: {
        filter: slotFilter(slot),
        update: { $set: slot },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  console.log(
    `${programmeCode}: programme ${programmeResult.upsertedCount}/${programmeResult.matchedCount}, ` +
      `courses ${courseResult.upsertedCount}/${courseResult.matchedCount}, ` +
      `slots ${slotResult.upsertedCount}/${slotResult.matchedCount}`,
  );
}

async function main() {
  const programmeCode = (process.argv[2] ?? "").toUpperCase();
  if (!/^[A-Z0-9]+$/.test(programmeCode)) {
    console.error("usage: npm run seed -- <PROGRAMME_CODE e.g. UTCMPSI>");
    process.exit(1);
  }

  try {
    await seed(programmeCode);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
