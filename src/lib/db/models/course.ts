import mongoose, { Schema, type Model, type SchemaDefinition } from "mongoose";
import type { Course } from "../../types";

const courseDefinition = {
  code: { type: String, required: true, trim: true, unique: true },
  title: { type: String, required: true, trim: true },
  credits: { type: Number, required: true, min: 0 },
  level: { type: Number, required: true, min: 7, max: 12 },
  semester: {
    type: Schema.Types.Mixed,
    required: true,
    enum: [1, 2, "full"] satisfies Course["semester"][],
  },
  school: { type: String, required: true, trim: true },
  prerequisitesText: { type: String, required: true, default: "" },
  drpsUrl: { type: String, required: true, trim: true },
} satisfies SchemaDefinition<Course>;

export const CourseSchema = new Schema<Course>(courseDefinition, {
  collection: "courses",
  strict: "throw",
});

CourseSchema.index({ code: 1 }, { unique: true });

export const CourseModel: Model<Course> =
  (mongoose.models.Course as Model<Course> | undefined) ??
  mongoose.model<Course>("Course", CourseSchema);
