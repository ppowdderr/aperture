import { z } from "zod";
import { complete } from "./llm/client";
import type { Course, Preferences, TimeBlock } from "./types";

const courseCode = z.string().regex(/^[A-Z]{4}\d{5}$/);
const day = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** What the model may change. Everything optional; arrays replace, nulls clear. */
export const patchSchema = z
  .object({
    addBlocks: z
      .array(
        z.object({
          day,
          start: z.number().int().min(480).max(1080),
          end: z.number().int().min(480).max(1080),
          kind: z.enum(["free", "avoid", "prefer"]),
        }),
      )
      .max(30)
      .optional(),
    clearBlocks: z.boolean().optional(),
    earliestStart: z.number().int().min(480).max(1080).nullable().optional(),
    latestEnd: z.number().int().min(480).max(1080).nullable().optional(),
    maxBackToBackHours: z.number().min(1).max(12).nullable().optional(),
    maxGapHours: z.number().min(0).max(12).nullable().optional(),
    campusDaysTogether: z.preprocess((value) => (value === null ? undefined : value), z.boolean().optional()),
    take: z.array(courseCode).max(20).optional(),
    drop: z.array(courseCode).max(20).optional(),
    untake: z.array(courseCode).max(20).optional(),
    keywords: z.array(z.string().max(40)).max(10).optional(),
    reply: z.string().max(300).default("Preferences updated."),
    notes: z.array(z.string().max(120)).max(5).optional(),
  })
  .strict();

export type Patch = z.infer<typeof patchSchema>;

const blockId = (block: Omit<TimeBlock, "id">) => `${block.day}-${block.start}-${block.end}-${block.kind}`;

function placeBlock(blocks: TimeBlock[], block: TimeBlock): TimeBlock[] {
  const next: TimeBlock[] = [];
  for (const existing of blocks) {
    if (existing.id === block.id) continue;
    if (existing.day !== block.day || existing.end <= block.start || existing.start >= block.end) {
      next.push(existing);
      continue;
    }
    if (existing.start < block.start) next.push({ ...existing, end: block.start });
    if (existing.end > block.end) {
      const tail: TimeBlock = { ...existing, start: block.end };
      next.push({ ...tail, id: blockId(tail) });
    }
  }
  next.push(block);
  return next.sort((a, b) => a.day - b.day || a.start - b.start);
}

export function applyPatch(preferences: Preferences, patch: Patch): Preferences {
  let blocks = patch.clearBlocks ? [] : [...preferences.blocks];
  for (const block of patch.addBlocks ?? []) {
    if (block.end <= block.start) continue;
    blocks = placeBlock(blocks, { id: blockId(block), ...block });
  }

  const take = new Set(patch.take ?? []);
  const drop = new Set(patch.drop ?? []);
  const untake = new Set(patch.untake ?? []);
  const pinned = [...new Set([...preferences.pinned.filter((code) => !drop.has(code) && !untake.has(code)), ...take])].sort();
  const excluded = [...new Set([...preferences.excluded.filter((code) => !take.has(code) && !untake.has(code)), ...drop])].sort();

  return {
    ...preferences,
    blocks,
    earliestStart: patch.earliestStart === undefined ? preferences.earliestStart : patch.earliestStart,
    latestEnd: patch.latestEnd === undefined ? preferences.latestEnd : patch.latestEnd,
    maxBackToBackHours:
      patch.maxBackToBackHours === undefined ? preferences.maxBackToBackHours : patch.maxBackToBackHours,
    maxGapHours: patch.maxGapHours === undefined ? preferences.maxGapHours : patch.maxGapHours,
    campusDaysTogether: patch.campusDaysTogether ?? preferences.campusDaysTogether,
    wantKeywords: patch.keywords ? [...new Set([...preferences.wantKeywords, ...patch.keywords])] : preferences.wantKeywords,
    pinned,
    excluded,
  };
}

export interface Turn {
  role: "you" | "aperture";
  text: string;
}

/** Drops `take` codes the solver cannot place and explains each in `notes`. */
export function checkTake(
  patch: Patch,
  placeable: ReadonlySet<string>,
  reasonNot: (code: string) => string,
  titles: ReadonlyMap<string, string>,
): Patch {
  const take = patch.take ?? [];
  const bad = take.filter((code) => !placeable.has(code));
  if (bad.length === 0) return patch;
  return {
    ...patch,
    take: take.filter((code) => placeable.has(code)),
    notes: [...(patch.notes ?? []), ...bad.map((code) => `${titles.get(code) ?? code} can't be added: it ${reasonNot(code)}`)],
    reply: bad.length === take.length && !patch.drop?.length && !patch.addBlocks?.length ? "I couldn't add that." : patch.reply,
  };
}

export function systemPrompt(year: number, courses: readonly Course[], preferences: Preferences): string {
  const list = courses.map((course) => `${course.code} | ${course.title} | ${course.credits} cr | S${course.semester === "full" ? "1+2" : course.semester}`).join("\n");
  return `You turn a University of Edinburgh student's message into edits to their timetable preferences. Reply ONLY with one JSON object matching this TypeScript type, no prose outside it:
{ addBlocks?: {day:0-4 (Mon=0), start:minutes from midnight, end:minutes, kind:"free"|"avoid"|"prefer"}[], clearBlocks?: boolean,
  earliestStart?: minutes|null, latestEnd?: minutes|null, maxBackToBackHours?: number|null, maxGapHours?: number|null, campusDaysTogether?: boolean,
  take?: courseCode[] (must be in every plan), drop?: courseCode[] (never take), untake?: courseCode[] (remove a previous take/drop),
  keywords?: string[] (topics they want, used to rank courses), reply: string (<= 2 short sentences, plain, what you set), notes?: string[] (requests you could not express) }
The conversation so far is included; later messages refine or undo earlier ones ("actually keep Fridays" => remove the Friday block via clearBlocks + re-adding the others). Answer only for the LAST user message.
Rules: "no 9ams" => earliestStart 600 unless a day is named (then a free block 480-600 that day). "X off"/"free" => free block 480-1080 that day. Day is a 08:00-18:00 grid. Only use course codes from the list below; resolve nicknames (ML => INFR10086). "I want", "interested in" and similar subject phrases become keywords such as "databases" or "machine learning"; use take only when the student explicitly says they must take or require a named course. If the message is not about the timetable, return {"reply": "..."} explaining briefly. Year ${year}.
Current preferences: ${JSON.stringify({ blocks: preferences.blocks, earliestStart: preferences.earliestStart, latestEnd: preferences.latestEnd, maxBackToBackHours: preferences.maxBackToBackHours, maxGapHours: preferences.maxGapHours, pinned: preferences.pinned, excluded: preferences.excluded, keywords: preferences.wantKeywords })}
Courses available this year:
${list}`;
}

/** Ask the configured OpenAI-compatible model for one validated preference patch. */
export async function parseMessage(message: string, system: string, history: readonly Turn[] = []): Promise<Patch> {
  const conversation = history
    .slice(-10)
    .map((turn) => `${turn.role === "you" ? "Student" : "Aperture"}: ${turn.text}`)
    .join("\n");
  return complete(
    [
      system,
      conversation ? `Conversation so far:\n${conversation}` : "",
      `Latest student message:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    patchSchema,
  );
}
