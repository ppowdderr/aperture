/**
 * Course Timetable Browser HTML → data/slots-<CODE>.json (Slot[])
 *
 * The CTB requires Edinburgh SSO. For the hackathon data freeze we save the rendered
 * multi-course page as HTML from a logged-in browser, then run:
 *
 *   npm run export:timetable -- UTCMPSI --input /tmp/aperture-timetable.html
 *
 * The parser deliberately works from rendered HTML so no browser cookies/state are stored.
 */
import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { campusFor } from "../src/lib/campus";
import { courseListSchema, slotSchema } from "../src/lib/schemas";
import type { Course, Slot } from "../src/lib/types";

const dayNumbers: Record<string, 0 | 1 | 2 | 3 | 4> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function minutes(value: string): number {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function courseCodesFromEvent(
  $: ReturnType<typeof load>,
  event: AnyNode,
): string[] {
  const codes = new Set<string>();
  $(event)
    .find('.desc a[href*="/dpt/cx"]')
    .each((_, link) => {
      const href = $(link).attr("href") ?? "";
      const match = href.match(/\/cx([a-z]{4}\d{5})\.htm/i);
      if (match) codes.add(match[1].toUpperCase());
    });
  return [...codes];
}

export function parseTimetable(html: string, allowedCodes: Set<string>): Slot[] {
  const $ = load(html);
  const slots: Slot[] = [];
  let currentDay: 0 | 1 | 2 | 3 | 4 | undefined;

  $("#timetable > tbody > tr").each((_, row) => {
    const dayHeader = clean($(row).find("th.row-day-name").first().text());
    if (dayHeader in dayNumbers) currentDay = dayNumbers[dayHeader];
    if (currentDay === undefined) return;

    $(row)
      .find("div.event")
      .each((__, node) => {
        const event = $(node);
        const day = currentDay;
        if (day === undefined) return;

        const timeText = clean(event.find(".card-header p").first().text());
        const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (!timeMatch) return;

        const activity = clean(
          event.find(".card-header > div").first().text(),
        );
        const rooms: string[] = [];
        event.find(".facts li").eq(1).find("div").each((___, room) => {
          const value = clean($(room).text());
          if (value) rooms.push(value);
        });
        const room = rooms.join(" | ") || "Unknown";
        const group = clean(event.find(".event-head .label").first().text());
        const codes = courseCodesFromEvent($, node).filter((code) =>
          allowedCodes.has(code),
        );
        if (!codes.length) return;

        const weeksBySemester = new Map<1 | 2, number[]>();
        event.find("table.weeks td.on").each((___, cell) => {
          const title = $(cell).attr("title") ?? "";
          const match = title.match(/S([12])\s+Wk\s+(\d+)/);
          if (!match) return;
          const semester = Number(match[1]) as 1 | 2;
          const week = Number(match[2]);
          const weeks = weeksBySemester.get(semester) ?? [];
          weeks.push(week);
          weeksBySemester.set(semester, weeks);
        });

        for (const [semester, weeks] of weeksBySemester) {
          for (const course of codes) {
            slots.push({
              course,
              activity,
              ...(group ? { group } : {}),
              semester,
              day,
              start: minutes(timeMatch[1]),
              end: minutes(timeMatch[2]),
              weeks: [...new Set(weeks)].sort((a, b) => a - b),
              room,
              campus: campusFor(room),
            });
          }
        }
      });
  });

  return slotSchema
    .array()
    .parse(slots)
    .filter(
      (slot, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.course === slot.course &&
            candidate.activity === slot.activity &&
            candidate.group === slot.group &&
            candidate.semester === slot.semester &&
            candidate.day === slot.day &&
            candidate.start === slot.start &&
            candidate.end === slot.end &&
            candidate.room === slot.room &&
            candidate.weeks.join(",") === slot.weeks.join(","),
        ) === index,
    )
    .sort(
      (a, b) =>
        a.course.localeCompare(b.course) ||
        a.semester - b.semester ||
        a.day - b.day ||
        a.start - b.start ||
        a.activity.localeCompare(b.activity) ||
        (a.group ?? "").localeCompare(b.group ?? ""),
    );
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const programmeCode = (process.argv[2] ?? "").toUpperCase();
  const input = argument("--input");
  if (!/^[A-Z0-9]+$/.test(programmeCode) || !input) {
    console.error(
      "usage: npm run export:timetable -- <PROGRAMME_CODE> --input <rendered-ctb.html>",
    );
    process.exit(1);
  }

  const courses: Course[] = courseListSchema.parse(
    JSON.parse(readFileSync(join("data", `courses-${programmeCode}.json`), "utf8")),
  );
  const allowedCodes = new Set(courses.map((course) => course.code));
  const slots = parseTimetable(readFileSync(input, "utf8"), allowedCodes);
  const out = join("data", `slots-${programmeCode}.json`);
  writeFileSync(out, JSON.stringify(slots, null, 2) + "\n");

  const represented = new Set(slots.map((slot) => slot.course));
  const empty = courses.filter((course) => !represented.has(course.code));
  console.log(`${out}: ${slots.length} slots across ${represented.size} courses`);
  if (empty.length) {
    console.log(`courses without timetable events: ${empty.map((course) => course.code).join(", ")}`);
  }
}

if (process.argv[1]?.endsWith("export-timetable.ts")) main();
