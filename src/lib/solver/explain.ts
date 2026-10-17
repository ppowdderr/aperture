import type { Course, Preferences, ProgrammeYear, Rule } from "../types";

/** Why each course is in a solution: the search's structural reason plus any keyword it satisfies. */
export function explainCourses(
  codes: readonly string[],
  searchReasons: readonly string[],
  courses: readonly Course[],
  prefs: Preferences,
): string[] {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const keywords = prefs.wantKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  const out: string[] = [];
  for (const code of codes) {
    const structural = searchReasons.find((r) => r.startsWith(`${code} `)) ?? `${code} chosen from options`;
    out.push(prefs.pinned.includes(code) ? `${code} pinned by you` : structural);
    const title = byCode.get(code)?.title.toLowerCase() ?? "";
    for (const kw of keywords) if (title.includes(kw)) out.push(`${code} keyword: ${kw}`);
  }
  return out;
}

/** The DPT rules a legal year satisfies by construction, each pointing at its DRPS line. */
export function programmeRules(programme: ProgrammeYear, courses: readonly Course[]): Rule[] {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const rules: Rule[] = programme.compulsory.map((code) => ({
    kind: "compulsory",
    course: code,
    source: `Year ${programme.year} compulsory: ${byCode.get(code)?.title ?? code} (${code})`,
    url: byCode.get(code)?.drpsUrl ?? programme.drpsUrl,
  }));
  for (const g of programme.groups) {
    const range =
      g.minCredits === g.maxCredits
        ? `exactly ${g.minCredits} credits`
        : `between ${g.minCredits} and ${g.maxCredits} credits`;
    rules.push({
      kind: "creditRange",
      group: g.id,
      min: g.minCredits,
      max: g.maxCredits,
      source: g.notesText.trim() || `${g.title}: select ${range}`,
      url: programme.drpsUrl,
    });
  }
  return rules;
}
