import type { Campus } from "./types";

const centralMarkers = [
  /\bAT\b/,
  /\bFH\b/,
  /\b40GS\b/,
  /\b50GS\b/,
  /\bDHT\b/,
  /\bLG\b/,
  /APPLETON TOWER/,
  /GEORGE SQUARE/,
  /FUTURES INSTITUTE/,
  /INFORMATICS FORUM/,
  /CHRYSTAL MACMILLAN/,
  /ROBSON BUILDING/,
  /OLD COLLEGE/,
  /TEVIOT/,
];

const kbMarkers = [
  /\bJCMB\b/,
  /\bKB\b/,
  /KINGS BUILDINGS/,
  /\bASHWORTH\b/,
  /\bSWANN\b/,
  /\bDARWIN\b/,
  /\bNUCLEUS\b/,
];

/** Map a timetable room description to the small set of campuses needed by the planner. */
export function campusFor(room: string): Campus {
  const value = room.toUpperCase().replace(/[’']/g, "'");

  if (kbMarkers.some((pattern) => pattern.test(value))) return "kb";
  if (centralMarkers.some((pattern) => pattern.test(value))) return "central";
  return "other";
}
