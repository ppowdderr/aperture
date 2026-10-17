import { loadCourses, loadProgramme, loadSlots } from "../data";
import type { ProgrammeYear } from "../types";
import { assignGroups } from "./clash";
import { searchLegalYears } from "./search";

const [programmeCode = "UTCMPSI", yearArg = "3", ...rest] = process.argv.slice(2);
const year = Number(yearArg) as ProgrammeYear["year"];
const passedArg = rest.find((a) => a.startsWith("--passed="))?.slice("--passed=".length);

const programmes = loadProgramme(programmeCode);
const courses = loadCourses(programmeCode);
const slots = loadSlots(programmeCode);
const programme = programmes.find((p) => p.year === year);
if (!programme) {
  console.error(`No year ${year} in ${programmeCode}`);
  process.exit(1);
}

// Default student: passed everything compulsory in earlier years.
const passed = passedArg
  ? passedArg.split(",").map((s) => s.trim().toUpperCase())
  : programmes.filter((p) => p.year < year).flatMap((p) => p.compulsory);

const t0 = performance.now();
const legal = searchLegalYears({
  programme,
  courses,
  allYears: programmes,
  student: { programmeCode, year, passed, background: {} },
});
const ms = (performance.now() - t0).toFixed(1);

const title = new Map(courses.map((c) => [c.code, c]));
console.log(`${programme.programmeTitle}, year ${year}: ${legal.length} legal course sets in ${ms} ms\n`);
for (const set of legal.slice(0, 3)) {
  const clash = assignGroups(set.courses, slots);
  console.log(`${set.credits} credits · S1 ${set.semesterCredits[0]} / S2 ${set.semesterCredits[1]} · ${clash.ok ? "clash-free" : `${clash.clashes.length} clash(es)`}`);
  for (const code of set.courses) {
    const c = title.get(code)!;
    console.log(`  ${code}  ${String(c.credits).padStart(2)} cr  S${c.semester === "full" ? "1+2" : c.semester}  ${c.title}`);
  }
  console.log();
}
