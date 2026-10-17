/**
 * DRPS Degree Programme Table → data/programme-<CODE>.json  (ProgrammeYear[])
 *
 *   npm run scrape:drps -- UTCMPSI
 *
 * A DPT year has "Compulsory courses" plus option "blocks" (Group A, Group B ...). Each block has a
 * credit rule ("Select exactly 60 credits in this group.") and contains one or more sub-rules, each with
 * its own credit range and either a list of course cards or a link to a schedule ("Level 9 courses in
 * Schedules A to Q"). We emit the block as an OptionGroup (id "A") whose `courses` is the union of its
 * sub-rules' courses, and each sub-rule as an OptionGroup (id "A.1") with `parent: "A"`.
 */
import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { OptionGroup, ProgrammeYear } from "../src/lib/types";

export const DRPS_BASE = "https://www.drps.ed.ac.uk/25-26/dpt/";

const optionGroupSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  minCredits: z.number().int().nonnegative(),
  maxCredits: z.number().int().nonnegative(),
  courses: z.array(z.string().regex(/^[A-Z]{4}\d{5}$/)),
  schedules: z.string().optional(),
  notesText: z.string(),
  parent: z.string().optional(),
});
export const programmeYearSchema = z.object({
  programmeCode: z.string().regex(/^[A-Z0-9]+$/),
  programmeTitle: z.string().min(1),
  year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  compulsory: z.array(z.string().regex(/^[A-Z]{4}\d{5}$/)),
  groups: z.array(optionGroupSchema),
  notesText: z.string(),
  drpsUrl: z.string().url(),
}) satisfies z.ZodType<ProgrammeYear>;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "Select exactly 60 credits" → [60,60]; "between 40 and 60" → [40,60]; "at least 20" → [20,∞→9999]. */
export function parseCreditRule(text: string): { min: number; max: number } {
  const t = text.toLowerCase();
  let m = t.match(/exactly\s+(\d+)\s+credits?/);
  if (m) return { min: +m[1], max: +m[1] };
  m = t.match(/between\s+(\d+)\s+and\s+(\d+)\s+credits?/);
  if (m) return { min: +m[1], max: +m[2] };
  m = t.match(/at least\s+(\d+)\s+credits?/);
  if (m) return { min: +m[1], max: 9999 };
  m = t.match(/(?:up to|at most|a maximum of)\s+(\d+)\s+credits?/);
  if (m) return { min: 0, max: +m[1] };
  m = t.match(/(\d+)\s+credits?/);
  if (m) return { min: +m[1], max: +m[1] };
  return { min: 0, max: 9999 };
}

function courseCodes($: CheerioAPI, scope: AnyNode): string[] {
  const out: string[] = [];
  $(scope).find(".dpt-course-card .dpt-course-card__footer span").each((_, el) => {
    const code = clean($(el).text());
    if (/^[A-Z]{4}\d{5}$/.test(code)) out.push(code);
  });
  return out;
}

export function parseProgramme(html: string, programmeCode: string): ProgrammeYear[] {
  const $ = load(html);
  const code = programmeCode.toUpperCase();
  const header = clean($("h2.page-header").first().text());
  const programmeTitle = header.replace(/^Degree Programme Table:\s*/i, "").replace(/\s*\([A-Z0-9]+\)\s*$/, "").trim();
  const drpsUrl = `${DRPS_BASE}${code.toLowerCase()}.htm`;
  const years: ProgrammeYear[] = [];

  $("h3[id^=dpt-year-]").each((_, h) => {
    const year = Number($(h).attr("id")!.replace("dpt-year-", ""));
    if (!(year >= 1 && year <= 5)) return;
    const container = $(h).nextAll(".dpt-container").first();
    const notesText = clean(container.children(".dpt-help--diet").find("[data-uoeid]").text());

    const compulsory: string[] = [];
    container.children("h4").each((_, h4) => {
      if (/compulsory/i.test($(h4).text())) compulsory.push(...courseCodes($, $(h4).next(".panel")[0]!));
    });

    const groups: OptionGroup[] = [];
    const parseRule = (rule: AnyNode, id: string, parent?: string): OptionGroup => {
      const r = $(rule);
      const ruleText = clean(r.find(".dpt-rule__header span").text());
      const range = parseCreditRule(ruleText);
      const schedLink = r.find(".dpt-rule__header a").first();
      const courses = courseCodes($, rule);
      return {
        id,
        ...(parent ? { parent } : {}),
        title: clean(r.find(".dpt-rule__title").first().text()) || ruleText,
        minCredits: range.min,
        maxCredits: range.max,
        courses,
        ...(schedLink.length && courses.length === 0 ? { schedules: clean(schedLink.text()) } : {}),
        notesText: clean(r.find(".dpt-help--rule [data-uoeid]").text()),
      };
    };
    // Option rules follow the "Course options" heading: either grouped in .dpt-block (Group A ...) or
    // a bare rule panel (e.g. Year 2: "Select exactly 20 credits from Level 7 and 8 courses in Schedules ...").
    let standalone = 0;
    container.children("h4").filter((_, h4) => /option/i.test($(h4).text())).first()
      .nextAll(".dpt-block, .panel").each((_, el) => {
        if (!$(el).hasClass("dpt-block")) {
          groups.push(parseRule(el, `R${++standalone}`));
          return;
        }
        const head = $(el).children(".dpt-block__header");
        const title = clean(head.find("h3").first().text());
        const idMatch = title.match(/Group\s+([A-Z0-9]+)/i);
        const id = idMatch ? idMatch[1].toUpperCase() : `B${groups.length + 1}`;
        const blockRule = clean(head.clone().children("h3").remove().end().text());
        const { min, max } = parseCreditRule(blockRule);
        const children: OptionGroup[] = [];
        $(el).find(".dpt-block__contents > .panel").each((ri, rule) => children.push(parseRule(rule, `${id}.${ri + 1}`, id)));
        groups.push({
          id, title: title || `Group ${id}`, minCredits: min, maxCredits: max,
          courses: [...new Set(children.flatMap((c) => c.courses))],
          notesText: blockRule,
        }, ...children);
      });

    years.push(programmeYearSchema.parse({
      programmeCode: code, programmeTitle, year, compulsory: [...new Set(compulsory)], groups, notesText,
      drpsUrl: `${drpsUrl}#dpt-year-${year}`,
    }));
  });
  if (!years.length) throw new Error(`no DPT years found for ${code}`);
  return years;
}

async function main() {
  const code = (process.argv[2] ?? "").toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) { console.error("usage: npm run scrape:drps -- <PROGRAMME_CODE e.g. UTCMPSI>"); process.exit(1); }
  const url = `${DRPS_BASE}${code.toLowerCase()}.htm`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const years = parseProgramme(await res.text(), code);
  mkdirSync("data", { recursive: true });
  const out = `data/programme-${code}.json`;
  writeFileSync(out, JSON.stringify(years, null, 2) + "\n");
  const n = new Set(years.flatMap((y) => [...y.compulsory, ...y.groups.flatMap((g) => g.courses)])).size;
  console.log(`${out}: ${years.length} years, ${n} distinct courses`);
}

if (process.argv[1]?.endsWith("scrape-drps.ts")) main().catch((e) => { console.error(e); process.exit(1); });
