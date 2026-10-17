import mongoose, { Schema, type Model } from "mongoose";
import type { Rule } from "../../types";

const RuleSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: [
        "compulsory",
        "creditRange",
        "prerequisite",
        "mustPassBefore",
        "conditional",
      ] satisfies Rule["kind"][],
    },
  },
  {
    collection: "rules",
    discriminatorKey: "kind",
    strict: "throw",
  },
);

const ruleModel =
  (mongoose.models.Rule as Model<Rule> | undefined) ??
  mongoose.model<Rule>("Rule", RuleSchema);

const discriminators: Array<[Rule["kind"], Schema]> = [
  [
    "compulsory",
    new Schema(
      {
        course: { type: String, required: true },
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
      { _id: false, strict: "throw" },
    ),
  ],
  [
    "creditRange",
    new Schema(
      {
        group: { type: String, required: true },
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
      { _id: false, strict: "throw" },
    ),
  ],
  [
    "prerequisite",
    new Schema(
      {
        course: { type: String, required: true },
        requires: { type: [String], required: true },
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
      { _id: false, strict: "throw" },
    ),
  ],
  [
    "mustPassBefore",
    new Schema(
      {
        course: { type: String, required: true },
        year: { type: Number, required: true },
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
      { _id: false, strict: "throw" },
    ),
  ],
  [
    "conditional",
    new Schema(
      {
        course: { type: String, required: true },
        condition: { type: String, required: true },
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
      { _id: false, strict: "throw" },
    ),
  ],
];

for (const [kind, schema] of discriminators) {
  if (!ruleModel.discriminators?.[kind]) {
    ruleModel.discriminator(kind, schema);
  }
}

export { RuleSchema };
export const RuleModel = ruleModel;
