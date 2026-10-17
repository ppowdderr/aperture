import { z } from "zod";
import { ruleSchema } from "../schemas";
import type { ProgrammeYear, Rule } from "../types";
import { complete, LLMError } from "./client";

const courseValue = z.string().min(1);

const extractedRuleSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("mustPassBefore"),
      course: courseValue,
      year: z.number().int().min(1).max(5),
      source: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("conditional"),
      course: courseValue,
      condition: z.string().min(1),
      source: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("prerequisite"),
      course: courseValue,
      requires: z.array(courseValue).min(1),
      source: z.string().min(1),
    })
    .strict(),
]);

const responseSchema = z
  .object({
    rules: z.array(extractedRuleSchema).max(30),
  })
  .strict();

export function programmeNotes(programme: ProgrammeYear): string[] {
  return [
    programme.notesText,
    ...programme.groups.map((group) => group.notesText),
  ]
    .map((text) => text.trim())
    .filter(Boolean);
}

function courseResolver(notes: string[]): (value: string) => string | null {
  const codes = new Map<string, string>();
  for (const note of notes) {
    for (const match of note.matchAll(/\b([A-Z]{4}\d{5})\b(?:\s*\(([^)]+)\))?/gi)) {
      const code = match[1].toUpperCase();
      codes.set(code, code);
      if (match[2]) codes.set(match[2].trim().toUpperCase(), code);
    }
  }

  return (value) => {
    const direct = value.match(/\b[A-Z]{4}\d{5}\b/i)?.[0];
    if (direct) return direct.toUpperCase();
    return codes.get(value.trim().toUpperCase()) ?? null;
  };
}

function exactSource(source: string, notes: string[]): string | null {
  for (const note of notes) {
    if (note.includes(source)) return source;
    const index = note.toLowerCase().indexOf(source.toLowerCase());
    if (index >= 0) return note.slice(index, index + source.length);
  }
  return null;
}

export function rulePrompt(programme: ProgrammeYear, notes: string[]): string {
  return [
    `Extract only explicit degree requirements from the ${programme.programmeTitle} Year ${programme.year} programme notes below.`,
    "Return rules of these kinds only:",
    '- mustPassBefore: {"kind":"mustPassBefore","course":"CODE","year":2,"source":"..."}',
    '- conditional: {"kind":"conditional","course":"CODE","condition":"...","source":"..."}',
    '- prerequisite: {"kind":"prerequisite","course":"CODE","requires":["CODE"],"source":"..."}',
    "Use upper-case course codes. Do not infer a requirement that is not stated.",
    "A course code is the 9-character code such as INFR07003. Text in parentheses such as INF1-CRISP or CAFI is an abbreviation, not a course code.",
    "A statement that students must pass named courses before progressing into Year 2 produces one mustPassBefore rule for each named course.",
    "A statement that a named course is required for students with a particular background produces a conditional rule for that course.",
    "For every rule, source must be an exact complete sentence copied verbatim from the notes. Do not paraphrase or join sentences.",
    "Do not return compulsory-course or credit-range rules; the deterministic parser already handles those.",
    'Return one top-level object shaped exactly like {"rules":[...]}. If there are no rules, return {"rules":[]}. Never return a rule object at the top level.',
    "",
    "Programme notes:",
    ...notes.map((note, index) => `[${index + 1}] ${note}`),
  ].join("\n");
}

/** Extract typed rules from programme prose, rejecting any unsupported source evidence. */
export async function extractRules(programme: ProgrammeYear): Promise<Rule[]> {
  const notes = programmeNotes(programme);
  if (notes.length === 0) return [];

  const response = await complete(rulePrompt(programme, notes), responseSchema);
  const resolveCourse = courseResolver(notes);
  const rules: Rule[] = [];

  for (const extracted of response.rules) {
    const source = exactSource(extracted.source, notes);
    if (!source) {
      throw new LLMError(
        "LLM returned a rule whose source is not verbatim programme prose",
        "invalid_response",
      );
    }

    const course = resolveCourse(extracted.course);
    if (!course) {
      throw new LLMError(
        `LLM returned an unrecognised course identifier: ${extracted.course}`,
        "invalid_response",
      );
    }

    if (extracted.kind === "mustPassBefore") {
      rules.push({
        kind: extracted.kind,
        course,
        year: extracted.year,
        source,
        url: programme.drpsUrl,
      });
    } else if (extracted.kind === "conditional") {
      rules.push({
        kind: extracted.kind,
        course,
        condition: extracted.condition,
        source,
        url: programme.drpsUrl,
      });
    } else {
      const requires = extracted.requires.map(resolveCourse);
      if (requires.some((value) => value === null)) {
        throw new LLMError(
          "LLM returned an unrecognised prerequisite course identifier",
          "invalid_response",
        );
      }
      rules.push({
        kind: extracted.kind,
        course,
        requires: requires as string[],
        source,
        url: programme.drpsUrl,
      });
    }
  }

  return ruleSchema.array().parse(rules);
}
