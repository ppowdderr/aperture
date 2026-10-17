/**
 * Seed checked-in programme data into MongoDB.
 *
 *   npm run seed -- UTCMPSI
 *
 * The operation is idempotent: programme years use (programmeCode, year), courses
 * use code, and timetable slots use their complete timetable value as the key.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { loadCourses, loadProgramme, loadSlots } from "../src/lib/data";
import { connectDb } from "../src/lib/db";
import {
  CourseModel,
  ProgrammeYearModel,
  SlotModel,
} from "../src/lib/db/models";
import type { Slot } from "../src/lib/types";

const envFile = join(process.cwd(), ".env.local");
if (!process.env.MONGODB_URI && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function programmeCodeFromArgs(): string {
  const code = (process.argv[2] ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) {
    throw new Error("Usage: npm run seed -- <PROGRAMME_CODE>");
  }
  return code;
}

function slotKey(slot: Slot) {
  return {
    course: slot.course,
    activity: slot.activity,
    group: slot.group,
    semester: slot.semester,
    day: slot.day,
    start: slot.start,
    end: slot.end,
    weeks: slot.weeks,
    room: slot.room,
    campus: slot.campus,
  };
}

async function main(): Promise<void> {
  const programmeCode = programmeCodeFromArgs();
  const programme = loadProgramme(programmeCode);
  const courses = loadCourses(programmeCode);
  const slots = loadSlots(programmeCode);

  await connectDb();

  const programmeResult = await ProgrammeYearModel.bulkWrite(
    programme.map((year) => ({
      updateOne: {
        filter: {
          programmeCode: year.programmeCode,
          year: year.year,
        },
        update: { $set: year },
        upsert: true,
      },
    })),
  );

  const courseResult = await CourseModel.bulkWrite(
    courses.map((course) => ({
      updateOne: {
        filter: { code: course.code },
        update: { $set: course },
        upsert: true,
      },
    })),
  );

  const slotResult = await SlotModel.bulkWrite(
    slots.map((slot) => ({
      updateOne: {
        filter: slotKey(slot),
        update: { $set: slot },
        upsert: true,
      },
    })),
  );

  console.info(
    `[seed] ${programmeCode}: ${programme.length} programme years, ` +
      `${courses.length} courses, ${slots.length} slots`,
  );
  console.info(
    `[seed] upserted programme=${programmeResult.upsertedCount}, ` +
      `course=${courseResult.upsertedCount}, slot=${slotResult.upsertedCount}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      `[seed] failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
