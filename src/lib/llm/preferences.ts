import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Preferences, TimeBlock } from "../types";
import { complete } from "./client";

const daySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const hourSchema = z.number().int().min(8 * 60).max(18 * 60).multipleOf(60);

const parsedBlockSchema = z
  .object({
    day: daySchema,
    start: hourSchema,
    end: hourSchema,
    kind: z.enum(["free", "avoid", "prefer"]),
  })
  .strict()
  .refine((block) => block.end > block.start, {
    message: "end must be after start",
    path: ["end"],
  });

export const llmPreferencesSchema = z
  .object({
    blocks: z.array(parsedBlockSchema).max(50).default([]),
    earliestStart: hourSchema.nullable().optional(),
    latestEnd: hourSchema.nullable().optional(),
    maxBackToBackHours: z.number().int().min(1).max(12).nullable().optional(),
    maxGapHours: z.number().int().min(0).max(12).nullable().optional(),
    campusDaysTogether: z.boolean().optional(),
    wantKeywords: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    for (let i = 0; i < value.blocks.length; i += 1) {
      for (let j = i + 1; j < value.blocks.length; j += 1) {
        const a = value.blocks[i];
        const b = value.blocks[j];
        if (
          a.day === b.day &&
          a.start < b.end &&
          b.start < a.end
        ) {
          context.addIssue({
            code: "custom",
            message: "parsed blocks must not overlap",
            path: ["blocks", j],
          });
        }
      }
    }
  });

export type ParsedPreferences = z.infer<typeof llmPreferencesSchema>;

const prompt = (text: string) => `
Convert the student's timetable preference sentence into a json object.

Days: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday.
Times are minutes since midnight, aligned to whole hours from 08:00 (480) to
18:00 (1080). Block kinds are:
- "free": the student wants no classes in this range
- "avoid": classes are undesirable but allowed
- "prefer": classes in this range are desirable

Examples:
- "No 9am classes on Monday or Tuesday" produces two free blocks:
  [{day:0,start:540,end:600,kind:"free"},
   {day:1,start:540,end:600,kind:"free"}]
- "Friday off" produces one free block:
  [{day:4,start:480,end:1080,kind:"free"}]

Only return fields explicitly supported by the sentence. Use wantKeywords for
subject interests such as databases or machine learning. Do not invent pins or
exclusions. For unrelated text, return {"blocks":[],"wantKeywords":[]}.

Student sentence:
${text}
`;

function uniqueKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const keyword of keywords) {
    const value = keyword.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** Parse a sentence into the subset of Preferences explicitly mentioned by the student. */
export async function parsePreferences(
  text: string,
): Promise<Partial<Preferences>> {
  const parsed = await complete(prompt(text), llmPreferencesSchema);
  const result: Partial<Preferences> = {};

  if (parsed.blocks.length > 0) {
    result.blocks = parsed.blocks.map(
      (block): TimeBlock => ({
        ...block,
        id: `ask-${randomUUID()}`,
      }),
    );
  }
  if (parsed.earliestStart !== undefined) {
    result.earliestStart = parsed.earliestStart;
  }
  if (parsed.latestEnd !== undefined) {
    result.latestEnd = parsed.latestEnd;
  }
  if (parsed.maxBackToBackHours !== undefined) {
    result.maxBackToBackHours = parsed.maxBackToBackHours;
  }
  if (parsed.maxGapHours !== undefined) {
    result.maxGapHours = parsed.maxGapHours;
  }
  if (parsed.campusDaysTogether !== undefined) {
    result.campusDaysTogether = parsed.campusDaysTogether;
  }

  const keywords = uniqueKeywords(parsed.wantKeywords);
  if (keywords.length > 0) result.wantKeywords = keywords;
  return result;
}
