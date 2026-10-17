import mongoose, { Schema, type Model, type SchemaDefinition } from "mongoose";
import type { Slot } from "../../types";

const slotDefinition = {
  course: { type: String, required: true, trim: true },
  activity: { type: String, required: true, trim: true },
  group: String,
  semester: {
    type: Number,
    required: true,
    enum: [1, 2] satisfies Array<Exclude<Slot["semester"], "full">>,
  },
  day: { type: Number, required: true, min: 0, max: 4 },
  start: { type: Number, required: true, min: 0, max: 1440 },
  end: { type: Number, required: true, min: 0, max: 1440 },
  weeks: { type: [Number], required: true, default: [] },
  room: { type: String, required: true, trim: true },
  campus: {
    type: String,
    required: true,
    enum: ["central", "kb", "other"] satisfies Slot["campus"][],
  },
} satisfies SchemaDefinition<Slot>;

export const SlotSchema = new Schema<Slot>(slotDefinition, {
  collection: "slots",
  strict: "throw",
});

SlotSchema.index({ course: 1, semester: 1, day: 1, start: 1 });

export const SlotModel: Model<Slot> =
  (mongoose.models.Slot as Model<Slot> | undefined) ??
  mongoose.model<Slot>("Slot", SlotSchema);
