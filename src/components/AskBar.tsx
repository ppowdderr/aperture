"use client";

import { useId, useState } from "react";
import { z } from "zod";
import type { Preferences, TimeBlock } from "@/lib/types";
import { placeBlock } from "./WeekGrid";

const day = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
const kind = z.enum(["free", "avoid", "prefer"]);
const block = z
  .object({
    id: z.string().min(1),
    day,
    start: z.number().int(),
    end: z.number().int(),
    kind,
  })
  .strict();

const partialPreferencesSchema = z
  .object({
    blocks: z.array(block).optional(),
    earliestStart: z.number().int().nullable().optional(),
    latestEnd: z.number().int().nullable().optional(),
    maxBackToBackHours: z.number().int().nullable().optional(),
    maxGapHours: z.number().int().nullable().optional(),
    campusDaysTogether: z.boolean().optional(),
    wantKeywords: z.array(z.string()).optional(),
  })
  .strict();

type PartialPreferences = z.infer<typeof partialPreferencesSchema>;

export interface AskBarProps {
  value: Preferences;
  onChange: (next: Preferences) => void;
}

export function mergePreferences(
  current: Preferences,
  patch: PartialPreferences,
): Preferences {
  let blocks: TimeBlock[] = current.blocks;
  for (const next of patch.blocks ?? []) {
    blocks = placeBlock(blocks, next);
  }

  const keywords = [...current.wantKeywords];
  const seen = new Set(keywords.map((keyword) => keyword.toLowerCase()));
  for (const keyword of patch.wantKeywords ?? []) {
    if (!seen.has(keyword.toLowerCase())) {
      seen.add(keyword.toLowerCase());
      keywords.push(keyword);
    }
  }

  return {
    ...current,
    blocks,
    earliestStart:
      patch.earliestStart !== undefined
        ? patch.earliestStart
        : current.earliestStart,
    latestEnd:
      patch.latestEnd !== undefined ? patch.latestEnd : current.latestEnd,
    maxBackToBackHours:
      patch.maxBackToBackHours !== undefined
        ? patch.maxBackToBackHours
        : current.maxBackToBackHours,
    maxGapHours:
      patch.maxGapHours !== undefined
        ? patch.maxGapHours
        : current.maxGapHours,
    campusDaysTogether:
      patch.campusDaysTogether !== undefined
        ? patch.campusDaysTogether
        : current.campusDaysTogether,
    wantKeywords: keywords,
  };
}

export function AskBar({ value, onChange }: AskBarProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const sentence = text.trim();
    if (!sentence || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/preferences/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const error =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Could not read that preference.";
        setMessage(error);
        return;
      }

      const parsed = partialPreferencesSchema.safeParse(body);
      if (!parsed.success) {
        setMessage("The preference parser returned an invalid response.");
        return;
      }

      const next = mergePreferences(value, parsed.data);
      if (JSON.stringify(next) === JSON.stringify(value)) {
        setMessage("I couldn't find a timetable preference in that sentence.");
        return;
      }

      onChange(next);
      const blockCount = parsed.data.blocks?.length ?? 0;
      const extras = [
        blockCount > 0
          ? `${blockCount} ${blockCount === 1 ? "block" : "blocks"}`
          : null,
        parsed.data.campusDaysTogether !== undefined
          ? "campus preference"
          : null,
        parsed.data.wantKeywords?.length
          ? `${parsed.data.wantKeywords.length} keyword${
              parsed.data.wantKeywords.length === 1 ? "" : "s"
            }`
          : null,
      ].filter(Boolean);
      setMessage(
        extras.length > 0
          ? `Applied ${extras.join(", ")}.`
          : "Preferences updated.",
      );
    } catch {
      setMessage("Could not reach the preference parser. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex shrink-0 flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label htmlFor={id} className="text-[13px] text-fg-faint">
        What you want, in your own words
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={id}
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="No 9ams on Monday or Tuesday, Friday off, something with machine learning or databases, keep King's Buildings days together."
          className="min-h-[3.5rem] max-h-32 w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2 placeholder:text-fg-faint field-sizing-content"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="h-9 shrink-0 rounded-md border border-line px-3 text-fg-muted hover:text-fg disabled:opacity-50"
        >
          {busy ? "Reading…" : "Apply"}
        </button>
      </div>
      <span role="status" aria-live="polite" className="min-h-4 text-[12px] text-fg-faint">
        {message ?? "The sentence updates the painted week below the planner."}
      </span>
    </form>
  );
}
