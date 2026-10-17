"use client";

import { useEffect, useRef, useState } from "react";
import type { Preferences, StudentState } from "../lib/types";
import { fmt } from "./WeekGrid";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const PARSE_TIMEOUT_MS = 20_000;

interface ChatConversationProps {
  student: StudentState;
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
  onApplied?: () => void;
  variant?: "hero" | "docked";
  initialMessage?: string;
}

interface Turn {
  role: "you" | "aperture";
  text: string;
  tone?: "error";
}

function blockKey(block: Preferences["blocks"][number]): string {
  return `${block.day}|${block.start}|${block.end}|${block.kind}`;
}

function blockSummary(block: Preferences["blocks"][number]): string {
  const day = DAYS[block.day];
  const wholeDay = block.start <= 480 && block.end >= 1080;
  const time = wholeDay ? "" : ` ${fmt(block.start)}–${fmt(block.end)}`;
  if (wholeDay && block.kind === "free") return `Kept ${day} free.`;
  if (wholeDay && block.kind === "avoid") return `Made ${day} one to avoid.`;
  if (wholeDay) return `Preferred classes on ${day}.`;
  if (block.kind === "free") return `Kept ${day}${time} free.`;
  if (block.kind === "avoid") return `Made ${day}${time} one to avoid.`;
  return `Preferred ${day}${time}.`;
}

/** A deterministic sentence for the exact change the server returned. */
export function describePreferenceChange(before: Preferences, after: Preferences): string {
  const parts: string[] = [];
  const oldBlocks = new Set(before.blocks.map(blockKey));
  for (const block of after.blocks) {
    if (!oldBlocks.has(blockKey(block))) parts.push(blockSummary(block));
  }

  if (before.earliestStart !== after.earliestStart && after.earliestStart !== null) {
    parts.push(`Set no classes before ${fmt(after.earliestStart)}.`);
  }
  if (before.latestEnd !== after.latestEnd && after.latestEnd !== null) {
    parts.push(`Set a finish time of ${fmt(after.latestEnd)}.`);
  }
  if (before.maxBackToBackHours !== after.maxBackToBackHours && after.maxBackToBackHours !== null) {
    parts.push(`Limited back-to-back classes to ${after.maxBackToBackHours} hours.`);
  }
  if (before.maxGapHours !== after.maxGapHours && after.maxGapHours !== null) {
    parts.push(`Limited gaps to ${after.maxGapHours} hours.`);
  }
  if (!before.campusDaysTogether && after.campusDaysTogether) {
    parts.push("Keeping each campus to its own days.");
  }

  const oldKeywords = new Set(before.wantKeywords.map((keyword) => keyword.toLowerCase()));
  for (const keyword of after.wantKeywords) {
    if (!oldKeywords.has(keyword.toLowerCase())) parts.push(`Interested in ${keyword}.`);
  }

  const oldPinned = new Set(before.pinned);
  for (const code of after.pinned) if (!oldPinned.has(code)) parts.push(`Must take ${code}.`);
  const oldExcluded = new Set(before.excluded);
  for (const code of after.excluded) if (!oldExcluded.has(code)) parts.push(`Won't take ${code}.`);

  return parts.length > 0 ? parts.join(" ") : "That didn't change your preferences.";
}

export function ChatConversation({
  student,
  preferences,
  onPreferencesChange,
  onApplied,
  variant = "docked",
  initialMessage,
}: ChatConversationProps) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => (initialMessage ? [{ role: "aperture", text: initialMessage }] : []));
  const [busy, setBusy] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const hero = variant === "hero";

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ block: "end" });
    }
  }, [busy, turns]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;

    const history = turns.slice(-10).map((turn) => ({ role: turn.role, text: turn.text }));
    setDraft("");
    setTurns((current) => [...current, { role: "you", text: message }]);
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          programmeCode: student.programmeCode,
          year: student.year,
          message,
          preferences,
          student,
          history,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        preferences?: Preferences;
        error?: string;
        notes?: string[];
      } | null;

      if (!response.ok || !body?.preferences) {
        setTurns((current) => [
          ...current,
          {
            role: "aperture",
            text: body?.error ?? "I couldn't read that request. Try naming a day, time or course.",
            tone: "error",
          },
        ]);
        return;
      }

      onPreferencesChange(body.preferences);
      onApplied?.();
      const notes = body.notes?.length ? ` ${body.notes.join(" ")}` : "";
      setTurns((current) => [
        ...current,
        { role: "aperture", text: `${describePreferenceChange(preferences, body.preferences!)}${notes}` },
      ]);
    } catch {
      setTurns((current) => [
        ...current,
        { role: "aperture", text: "The planner took too long to respond. Try again.", tone: "error" },
      ]);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Planner chat"
      aria-busy={busy}
      className="mx-auto flex w-full max-w-3xl flex-col gap-5"
    >
      {!hero && (
        <div className="flex max-h-[42vh] min-h-20 flex-col gap-4 overflow-y-auto pr-1">
          {turns.length > 0 ? (
            <ol aria-label="Conversation" className="flex flex-col gap-3">
              {turns.map((turn, index) => (
                <li
                  key={`${turn.role}-${index}`}
                  className={
                    turn.role === "you"
                      ? "ml-auto max-w-[85%] rounded-lg bg-panel-2 px-3.5 py-2.5 text-[15px] leading-relaxed text-fg"
                      : `max-w-[85%] text-[15px] leading-relaxed ${turn.tone === "error" ? "text-warning" : "text-fg-muted"}`
                  }
                >
                  {turn.text}
                </li>
              ))}
              {busy && <li className="text-[14px] text-fg-muted">Reading your week…</li>}
            </ol>
          ) : (
            <p className="text-[15px] leading-relaxed text-fg-muted">
              Describe a change. You can add a preference or undo an earlier one in the same conversation.
            </p>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className={`shrink-0 rounded-xl border bg-panel p-2 transition-colors focus-within:border-accent ${
          hero ? "border-line-strong shadow-[0_24px_72px_rgba(0,0,0,0.28)]" : "border-line"
        }`}
      >
        <label htmlFor="planner-message" className="sr-only">
          Describe your week
        </label>
        <textarea
          ref={textarea}
          id="planner-message"
          rows={hero ? 3 : 2}
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="No classes before 10, Fridays free, keep King’s Buildings days together…"
          className="block max-h-40 min-h-16 w-full resize-none bg-transparent px-2.5 py-2 text-[16px] leading-relaxed text-fg placeholder:text-fg-muted focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-1.5 pb-0.5">
          <span className="text-[12px] text-fg-muted">
            {busy ? "Reading your week…" : "Enter sends · Shift+Enter adds a line"}
          </span>
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="min-h-10 rounded-md bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none"
          >
            {busy ? "Reading…" : "Send"}
          </button>
        </div>
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {busy ? "Reading your week" : turns.at(-1)?.text ?? ""}
      </p>
    </section>
  );
}
