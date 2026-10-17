import type { Slot } from "../types";

export interface ClashResult {
  ok: boolean;
  /** `course:activity` → selected group name. */
  groups: Record<string, string>;
  clashes: string[];
}

interface GroupDecision {
  course: string;
  activity: string;
  choices: Map<string, Slot[]>;
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function groupKey(course: string, activity: string): string {
  return `${course}:${activity}`;
}

/** Two slots overlap only when they share a semester, day, time and at least one teaching week. */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  if (a.semester !== b.semester || a.day !== b.day) return false;
  if (a.start >= b.end || b.start >= a.end) return false;

  const aWeeks = new Set(a.weeks);
  return b.weeks.some((week) => aWeeks.has(week));
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatWeeks(weeks: number[]): string {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  if (sorted.length === 0) return "no teaching weeks";

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (const week of sorted.slice(1)) {
    if (week === end + 1) {
      end = week;
      continue;
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
    start = week;
    end = week;
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return `weeks ${ranges.join(", ")}`;
}

function slotLabel(slot: Slot): string {
  const group = slot.group ? ` (${slot.group})` : "";
  return (
    `${slot.course} ${slot.activity}${group} — ` +
    `${dayNames[slot.day]} ${formatTime(slot.start)}-${formatTime(slot.end)}, ` +
    `semester ${slot.semester}, ${formatWeeks(slot.weeks)}`
  );
}

function sameActivity(a: Slot, b: Slot): boolean {
  return (
    a.course === b.course &&
    a.activity === b.activity &&
    a.group === b.group
  );
}

function collectClashes(slots: Slot[]): string[] {
  const clashes: string[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i];
      const b = slots[j];
      if (sameActivity(a, b) || !slotsOverlap(a, b)) continue;
      clashes.push(`${slotLabel(a)} clashes with ${slotLabel(b)}`);
    }
  }
  return clashes;
}

function slotIdentity(slot: Slot): string {
  return JSON.stringify([
    slot.course,
    slot.activity,
    slot.group,
    slot.semester,
    slot.day,
    slot.start,
    slot.end,
    [...slot.weeks].sort((a, b) => a - b),
    slot.room,
    slot.campus,
  ]);
}

/**
 * Choose one tutorial/lab group per course activity while keeping the selected
 * course set clashing-free. Lecture-style slots with no group are always fixed.
 */
export function assignGroups(
  courses: Iterable<string>,
  slots: readonly Slot[],
): ClashResult {
  const selectedCourses = new Set(courses);
  const fixed: Slot[] = [];
  const decisionsByKey = new Map<string, GroupDecision>();
  const seenSlots = new Set<string>();

  for (const slot of slots) {
    if (!selectedCourses.has(slot.course)) continue;

    const identity = slotIdentity(slot);
    if (seenSlots.has(identity)) continue;
    seenSlots.add(identity);

    if (slot.group === undefined) {
      fixed.push(slot);
      continue;
    }

    const key = groupKey(slot.course, slot.activity);
    let decision = decisionsByKey.get(key);
    if (!decision) {
      decision = {
        course: slot.course,
        activity: slot.activity,
        choices: new Map(),
      };
      decisionsByKey.set(key, decision);
    }

    const groupSlots = decision.choices.get(slot.group) ?? [];
    groupSlots.push(slot);
    decision.choices.set(slot.group, groupSlots);
  }

  const fixedClashes = collectClashes(fixed);
  if (fixedClashes.length > 0) {
    return { ok: false, groups: {}, clashes: fixedClashes };
  }

  const decisions = [...decisionsByKey.values()].sort((a, b) => {
    if (a.choices.size !== b.choices.size) return a.choices.size - b.choices.size;
    return groupKey(a.course, a.activity).localeCompare(
      groupKey(b.course, b.activity),
    );
  });

  let bestClashes: string[] | null = null;
  function rememberClashes(clashes: string[]): void {
    if (clashes.length === 0) return;
    if (!bestClashes || clashes.length < bestClashes.length) {
      bestClashes = clashes;
    }
  }

  function search(
    index: number,
    activeSlots: Slot[],
    selectedGroups: Array<[string, string]>,
  ): Array<[string, string]> | null {
    if (index === decisions.length) return selectedGroups;

    const decision = decisions[index];
    const groupNames = [...decision.choices.keys()].sort();
    for (const groupName of groupNames) {
      const groupSlots = decision.choices.get(groupName);
      if (!groupSlots) continue;

      const candidateSlots = [...activeSlots, ...groupSlots];
      const clashes = collectClashes(candidateSlots);
      if (clashes.length > 0) {
        rememberClashes(clashes);
        continue;
      }

      const result = search(
        index + 1,
        candidateSlots,
        [
          ...selectedGroups,
          [groupKey(decision.course, decision.activity), groupName],
        ],
      );
      if (result) return result;
    }

    return null;
  }

  const selected = search(0, fixed, []);
  if (!selected) {
    return {
      ok: false,
      groups: {},
      clashes: bestClashes ?? ["No clash-free group assignment exists"],
    };
  }

  return {
    ok: true,
    groups: Object.fromEntries(selected),
    clashes: [],
  };
}
