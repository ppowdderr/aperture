"use client";

import { useState } from "react";
import { fmt } from "./WeekGrid";
import type { Course, Preferences, StudentState } from "../lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const KIND = { free: "free", avoid: "avoid", prefer: "prefer" } as const;

interface ChatProps {
  student: StudentState;
  courses: Course[];
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
}

interface Turn {
  role: "you" | "aperture";
  text: string;
  tone?: "error";
}

/** Chips are the truth: everything the model sets shows here and can be removed by hand. */
export function chips(prefs: Preferences, titles: Map<string, string>): { key: string; text: string; remove: (p: Preferences) => Preferences }[] {
  const out: { key: string; text: string; remove: (p: Preferences) => Preferences }[] = [];
  for (const b of prefs.blocks) {
    const whole = b.start <= 480 && b.end >= 1080;
    out.push({
      key: `b:${b.id}`,
      text: `${DAYS[b.day]} ${whole ? "all day" : `${fmt(b.start)}–${fmt(b.end)}`} ${KIND[b.kind]}`,
      remove: (p) => ({ ...p, blocks: p.blocks.filter((x) => x.id !== b.id) }),
    });
  }
  if (prefs.earliestStart !== null) out.push({ key: "early", text: `Not before ${fmt(prefs.earliestStart)}`, remove: (p) => ({ ...p, earliestStart: null }) });
  if (prefs.latestEnd !== null) out.push({ key: "late", text: `Done by ${fmt(prefs.latestEnd)}`, remove: (p) => ({ ...p, latestEnd: null }) });
  if (prefs.maxBackToBackHours !== null) out.push({ key: "run", text: `Max ${prefs.maxBackToBackHours} h back-to-back`, remove: (p) => ({ ...p, maxBackToBackHours: null }) });
  if (prefs.maxGapHours !== null) out.push({ key: "gap", text: `Gaps ≤ ${prefs.maxGapHours} h`, remove: (p) => ({ ...p, maxGapHours: null }) });
  if (prefs.campusDaysTogether) out.push({ key: "campus", text: "One campus per day", remove: (p) => ({ ...p, campusDaysTogether: false }) });
  for (const c of prefs.pinned) out.push({ key: `pin:${c}`, text: `Taking ${titles.get(c) ?? c}`, remove: (p) => ({ ...p, pinned: p.pinned.filter((x) => x !== c) }) });
  for (const c of prefs.excluded) out.push({ key: `ex:${c}`, text: `Not taking ${titles.get(c) ?? c}`, remove: (p) => ({ ...p, excluded: p.excluded.filter((x) => x !== c) }) });
  for (const k of prefs.wantKeywords) out.push({ key: `kw:${k}`, text: `Interested in ${k}`, remove: (p) => ({ ...p, wantKeywords: p.wantKeywords.filter((x) => x !== k) }) });
  return out;
}

export function Chat({ student, courses, preferences, onPreferencesChange }: ChatProps) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const titles = new Map(courses.map((c) => [c.code, c.title]));
  const list = chips(preferences, titles);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((t) => [...t, { role: "you", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ programmeCode: student.programmeCode, year: student.year, message, preferences }),
      });
      const data = (await res.json()) as { preferences?: Preferences; reply?: string; notes?: string[]; error?: string };
      if (!res.ok || !data.preferences) {
        setTurns((t) => [...t, { role: "aperture", text: data.error ?? "Something went wrong.", tone: "error" }]);
        return;
      }
      onPreferencesChange(data.preferences);
      const notes = data.notes?.length ? ` Noted but not enforced: ${data.notes.join("; ")}.` : "";
      setTurns((t) => [...t, { role: "aperture", text: `${data.reply ?? "Done."}${notes}` }]);
    } catch {
      setTurns((t) => [...t, { role: "aperture", text: "Couldn't reach the parser.", tone: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Describe your week" className="flex flex-col gap-3">
      {list.length > 0 ? (
        <ul aria-label="Your constraints" className="flex flex-wrap gap-1.5">
          {list.map((c) => (
            <li key={c.key} className="flex items-center gap-1 rounded-md border border-line bg-panel-2 pl-2.5 pr-1 text-[13px] text-fg">
              {c.text}
              <button
                type="button"
                aria-label={`Remove: ${c.text}`}
                onClick={() => onPreferencesChange(c.remove(preferences))}
                className="rounded px-1 text-fg-faint hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-fg-faint">No constraints yet — the plans below are just legal years.</p>
      )}
      {turns.length > 0 && (
        <ol aria-label="Conversation" className="flex max-h-40 flex-col gap-1.5 overflow-auto text-[14px]">
          {turns.slice(-6).map((t, i) => (
            <li key={i} className={t.role === "you" ? "text-fg-muted" : t.tone === "error" ? "text-amber-700" : "text-fg"}>
              <span className="mr-2 font-mono text-[11px] uppercase tracking-wide text-fg-faint">{t.role}</span>
              {t.text}
            </li>
          ))}
        </ol>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="No 9ams, Fridays off, I want machine learning…"
          aria-label="Describe your week"
          className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-panel px-3 text-[15px] text-fg placeholder:text-fg-faint"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="h-10 rounded-md bg-accent px-4 text-[15px] font-medium text-white disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
