import mongoose, { Schema, type Model, type SchemaDefinition } from "mongoose";
import type { OptionGroup, ProgrammeYear } from "../../types";

const optionGroupDefinition = {
  id: { type: String, required: true },
  title: { type: String, required: true },
  minCredits: { type: Number, required: true, min: 0 },
  maxCredits: { type: Number, required: true, min: 0 },
  courses: { type: [String], required: true, default: [] },
  schedules: String,
  notesText: { type: String, required: true, default: "" },
  parent: String,
} satisfies SchemaDefinition<OptionGroup>;

const OptionGroupSchema = new Schema<OptionGroup>(optionGroupDefinition, {
  _id: false,
  strict: "throw",
});

const programmeYearDefinition = {
  programmeCode: { type: String, required: true, trim: true },
  programmeTitle: { type: String, required: true, trim: true },
  year: { type: Number, required: true, min: 1, max: 5 },
  compulsory: { type: [String], required: true, default: [] },
  groups: { type: [OptionGroupSchema], required: true, default: [] },
  notesText: { type: String, required: true, default: "" },
  drpsUrl: { type: String, required: true, trim: true },
} satisfies SchemaDefinition<ProgrammeYear>;

export const ProgrammeYearSchema = new Schema<ProgrammeYear>(
  programmeYearDefinition,
  {
    collection: "programme_years",
    strict: "throw",
  },
);

ProgrammeYearSchema.index({ programmeCode: 1, year: 1 }, { unique: true });

export const ProgrammeYearModel: Model<ProgrammeYear> =
  (mongoose.models.ProgrammeYear as Model<ProgrammeYear> | undefined) ??
  mongoose.model<ProgrammeYear>("ProgrammeYear", ProgrammeYearSchema);
