/** Mongo stores an omitted optional field as null; the shared Slot type omits it. */
export function normaliseSlotRows(rows: readonly unknown[]): unknown[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const slot = { ...(row as Record<string, unknown>) };
    if (slot.group === null) delete slot.group;
    return slot;
  });
}
