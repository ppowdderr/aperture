/**
 * DRPS course pages → data/courses-<CODE>.json (Course[])
 *
 *   npm run scrape:courses -- UTCMPSI
 *
 * The programme JSON is the source of truth for which courses to fetch. HTML is cached under
 * scripts/.cache so a second run is deterministic and makes no network requests.
 */
import { load } from "cheerio";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import type {
  Course,
  ProgrammeYear,
  Semester,
} from "../src/lib/types";
import { DEFAULT_SESSION, drpsBase } from "./scrape-drps";

const courseSchema = z.object({
  code: z.string().regex(/^[A-Z]{4}\d{5}$/),
  title: z.string().min(1),
  credits: z.number().int().nonnegative(),
  level: z.number().int().min(7).max(12),
  semester: z.union([z.literal(1), z.literal(2), z.literal("full")]),
  school: z.string().min(1),
  prerequisitesText: z.string(),
  drpsUrl: z.string().url(),
}) satisfies z.ZodType<Course>;

export const courseListSchema = z.array(courseSchema);

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface FetchOptions {
  session?: string;
  cacheDir?: string;
  fetchImpl?: FetchLike;
  delayMs?: number;
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function parseSemester(value: string): Semester {
  if (value === "Semester 1") return 1;
  if (value === "Semester 2") return 2;
  if (value === "Full Year") return "full";
  throw new Error(`unsupported Course Start value: ${value}`);
}

export function isDelivered(html: string): boolean {
  return !html.includes("Not being delivered");
}

export function programmeCourseCodes(programme: ProgrammeYear[]): string[] {
  const codes = programme.flatMap((year) => [
    ...year.compulsory,
    ...year.groups.flatMap((group) => group.courses),
  ]);

  return [...new Set(codes)].sort();
}

export function parseCourse(
  html: string,
  expectedCode: string,
  session: string = DEFAULT_SESSION,
): Course {
  const $ = load(html);
  const code = clean($('meta[name="modcode"]').attr("content") ?? "").toUpperCase();
  if (code !== expectedCode.toUpperCase()) {
    throw new Error(`expected ${expectedCode}, found ${code || "no course code"}`);
  }

  const valueFor = (label: string): string => {
    const heading = $("td.rowhead1")
      .filter((_, cell) => clean($(cell).text()) === label)
      .first();
    return clean(heading.next("td").text());
  };

  const creditsText = valueFor("SCQF Credits");
  const levelText = valueFor("Credit level (Normal year taken)");
  const creditsMatch = creditsText.match(/\d+/);
  const levelMatch = levelText.match(/SCQF Level\s+(\d+)/);

  if (!creditsMatch) throw new Error(`${code}: missing SCQF credits`);
  if (!levelMatch) throw new Error(`${code}: missing SCQF level`);

  return courseSchema.parse({
    code,
    title: clean($('meta[name="modname"]').attr("content") ?? $("h1").first().text()),
    credits: Number(creditsMatch[0]),
    level: Number(levelMatch[1]),
    semester: parseSemester(valueFor("Course Start")),
    school: valueFor("School"),
    prerequisitesText: valueFor("Pre-requisites"),
    drpsUrl: `${drpsBase(session)}cx${code.toLowerCase()}.htm`,
  });
}

export async function getCourseHtml(
  code: string,
  {
    session = DEFAULT_SESSION,
    cacheDir = join("scripts", ".cache", "courses", session),
    fetchImpl = fetch,
    delayMs = 300,
  }: FetchOptions = {},
): Promise<string> {
  const cachePath = join(cacheDir, `${code.toUpperCase()}.html`);
  if (existsSync(cachePath)) return readFileSync(cachePath, "utf8");

  if (delayMs > 0) await sleep(delayMs);
  const url = `${drpsBase(session)}cx${code.toLowerCase()}.htm`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`${url} → ${response.status}`);

  const html = await response.text();
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cachePath, html);
  return html;
}

async function main() {
  const programmeCode = (process.argv[2] ?? "").toUpperCase();
  if (!/^[A-Z0-9]+$/.test(programmeCode)) {
    console.error("usage: npm run scrape:courses -- <PROGRAMME_CODE e.g. UTCMPSI>");
    process.exit(1);
  }

  const session = process.env.DRPS_SESSION ?? DEFAULT_SESSION;
  if (!/^\d{2}-\d{2}$/.test(session)) {
    throw new Error(`DRPS_SESSION must look like 26-27, got ${session}`);
  }

  const programmePath = join("data", `programme-${programmeCode}.json`);
  const programme = JSON.parse(readFileSync(programmePath, "utf8")) as ProgrammeYear[];
  const codes = programmeCourseCodes(programme);
  const courses: Course[] = [];
  const unavailable: string[] = [];

  for (const code of codes) {
    const html = await getCourseHtml(code, { session });
    if (!isDelivered(html)) {
      unavailable.push(code);
      continue;
    }
    courses.push(parseCourse(html, code, session));
  }

  const out = join("data", `courses-${programmeCode}.json`);
  writeFileSync(out, JSON.stringify(courseListSchema.parse(courses), null, 2) + "\n");
  console.log(`${out} (${session}): ${courses.length} delivered courses`);
  if (unavailable.length) {
    console.warn(`not delivered in ${session}: ${unavailable.join(", ")}`);
  }
}

if (process.argv[1]?.endsWith("scrape-courses.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
