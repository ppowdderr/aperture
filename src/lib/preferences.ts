import type { Preferences } from "./types";

/** True when the saved preference object contains anything the solver can score. */
export function hasAppliedPreferences(preferences: Preferences): boolean {
  return (
    preferences.blocks.length > 0 ||
    preferences.earliestStart !== null ||
    preferences.latestEnd !== null ||
    preferences.maxBackToBackHours !== null ||
    preferences.maxGapHours !== null ||
    preferences.campusDaysTogether ||
    preferences.wantKeywords.length > 0 ||
    preferences.pinned.length > 0 ||
    preferences.excluded.length > 0
  );
}
