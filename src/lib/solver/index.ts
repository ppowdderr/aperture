import type { Preferences, ProgrammeYear, Course, Slot, StudentState, Solution } from "../types";

export interface SolveInput {
  programme: ProgrammeYear;
  courses: Course[];
  slots: Slot[];
  student: StudentState;
  preferences: Preferences;
  count?: number;
}

/** Owned by the solver tickets (M2). Stub so the API route and UI can be built against the type. */
export function solve(_input: SolveInput): Solution[] {
  return [];
}
