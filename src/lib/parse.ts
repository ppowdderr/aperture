import { z } from "zod";
import type { Course, Preferences } from "./types";

const courseCode = z.string().regex(/^[A-Z]{4}\d{5}$/);
const day = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** What the model may change. Everything optional; arrays replace, nulls clear. */
export const patchSchema = z
  .object({
    addBlocks: z.array(z.object({ day, start: z.number().int().min(480).max(1080), end: z.number().int().min(480).max(1080), kind: z.enum(["free", "avoid", "prefer"]) })).max(30).optional(),
    clearBlocks: z.boolean().optional(),
    earliestStart: z.number().int().min(480).max(1080).nullable().optional(),
    latestEnd: z.number().int().min(480).max(1080).nullable().optional(),
    maxBackToBackHours: z.number().min(1).max(12).nullable().optional(),
    maxGapHours: z.number().min(0).max(12).nullable().optional(),
    campusDaysTogether: z.boolean().optional(),
    take: z.array(courseCode).max(20).optional(),
    drop: z.array(courseCode).max(20).optional(),
    untake: z.array(courseCode).max(20).optional(),
    keywords: z.array(z.string().max(40)).max(10).optional(),
    reply: z.string().max(300),
    notes: z.array(z.string().max(120)).max(5).optional(),
  })
  .strict();
export type Patch = z.infer<typeof patchSchema>;

export function applyPatch(prefs: Preferences, p: Patch): Preferences {
  let blocks = p.clearBlocks ? [] : [...prefs.blocks];
  for (const b of p.addBlocks ?? []) {
    if (b.end <= b.start) continue;
    blocks.push({ id: `${b.day}-${b.start}-${b.end}-${b.kind}`, ...b });
  }
  blocks = blocks.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
  const take = new Set(p.take ?? []);
  const drop = new Set(p.drop ?? []);
  const untake = new Set(p.untake ?? []);
  const pinned = [...new Set([...prefs.pinned.filter((c) => !drop.has(c) && !untake.has(c)), ...take])].sort();
  const excluded = [...new Set([...prefs.excluded.filter((c) => !take.has(c) && !untake.has(c)), ...drop])].sort();
  return {
    ...prefs,
    blocks,
    earliestStart: p.earliestStart === undefined ? prefs.earliestStart : p.earliestStart,
    latestEnd: p.latestEnd === undefined ? prefs.latestEnd : p.latestEnd,
    maxBackToBackHours: p.maxBackToBackHours === undefined ? prefs.maxBackToBackHours : p.maxBackToBackHours,
    maxGapHours: p.maxGapHours === undefined ? prefs.maxGapHours : p.maxGapHours,
    campusDaysTogether: p.campusDaysTogether ?? prefs.campusDaysTogether,
    wantKeywords: p.keywords ? [...new Set([...prefs.wantKeywords, ...p.keywords])] : prefs.wantKeywords,
    pinned,
    excluded,
  };
}

export function systemPrompt(year: number, courses: readonly Course[], prefs: Preferences): string {
  const list = courses.map((c) => `${c.code} | ${c.title} | ${c.credits} cr | S${c.semester === "full" ? "1+2" : c.semester}`).join("\n");
  return `You turn a University of Edinburgh student's message into edits to their timetable preferences. Reply ONLY with one JSON object matching this TypeScript type, no prose outside it:
{ addBlocks?: {day:0-4 (Mon=0), start:minutes from midnight, end:minutes, kind:"free"|"avoid"|"prefer"}[], clearBlocks?: boolean,
  earliestStart?: minutes|null, latestEnd?: minutes|null, maxBackToBackHours?: number|null, maxGapHours?: number|null, campusDaysTogether?: boolean,
  take?: courseCode[] (must be in every plan), drop?: courseCode[] (never), untake?: courseCode[] (remove a previous take/drop),
  keywords?: string[] (topics they want, used to rank courses), reply: string (<= 2 short sentences, plain, what you set), notes?: string[] (requests you could not express) }
Rules: "no 9ams" => earliestStart 600 unless a day is named (then a free block 480-600 that day). "X off"/"free" => free block 480-1080 that day. Day is a 08:00-18:00 grid. Only use course codes from the list below; resolve nicknames (ML => INFR10086). If the message is not about the timetable, return {"reply": "..."} explaining briefly. Year ${year}.
Current preferences: ${JSON.stringify({ blocks: prefs.blocks, earliestStart: prefs.earliestStart, latestEnd: prefs.latestEnd, maxBackToBackHours: prefs.maxBackToBackHours, maxGapHours: prefs.maxGapHours, pinned: prefs.pinned, excluded: prefs.excluded, keywords: prefs.wantKeywords })}
Courses available this year:
${list}`;
}

/** Calls DeepSeek (OpenAI-compatible). Throws on network/API error; returns null when the output isn't a valid patch. */
export async function parseWithDeepSeek(message: string, system: string, fetchImpl: typeof fetch = fetch): Promise<Patch | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  const res = await fetchImpl("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = patchSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
