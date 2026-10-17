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
  /LISTER LEARNING/,
  /DUGALD STEWART/,
  /CHARTERIS LAND/,
  /OLD INFIRMARY/,
  /OLD SURGEONS HALL/,
  /HIGH SCHOOL YARDS/,
  /CHAMBERS STREET/,
  /MINTO HOUSE/,
  /ADAM HOUSE/,
  /PATERSONS LAND/,
  /ALISON HOUSE/,
  /BUSINESS SCHOOL/,
  /ST JOHNS LAND/,
  /ST LEONARDS LAND/,
  /\bECCI\b/,
];

const kbMarkers = [
  /\bJCMB\b/,
  /\bKB\b/,
  /KINGS BUILDINGS/,
  /\bASHWORTH\b/,
  /\bSWANN\b/,
  /\bDARWIN\b/,
  /\bNUCLEUS\b/,
  /MURCHISON HOUSE/,
  /GRANT INSTITUTE/,
  /ENGINEERING FORUM/,
  /JAMES CLERK MAXWELL/,
];

/** Map a timetable room description to the small set of campuses needed by the planner. */
export function campusFor(room: string): Campus {
  const value = room.toUpperCase().replace(/[’']/g, "'");

  if (kbMarkers.some((pattern) => pattern.test(value))) return "kb";
  if (centralMarkers.some((pattern) => pattern.test(value))) return "central";
  return "other";
}
