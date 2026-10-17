import { describe, expect, it } from "vitest";
import type { Course } from "../../types";
import { CourseModel } from "./course";

const machineLearning: Course = {
  code: "INFR10086",
  title: "Machine Learning",
  credits: 20,
  level: 10,
  semester: 2,
  school: "School of Informatics",
  prerequisitesText: "Informatics 2 - Foundations of Data Science",
  drpsUrl: "https://www.drps.ed.ac.uk/26-27/dpt/cxinfr10086.htm",
};

describe("CourseModel", () => {
  it("builds and validates a document from a Course object", async () => {
    const document = new CourseModel(machineLearning);

    await expect(document.validate()).resolves.toBeUndefined();
    expect(document.toObject()).toMatchObject(machineLearning);
  });

  it("rejects unknown fields", () => {
    expect(
      () =>
        new CourseModel({
          ...machineLearning,
          unexpected: true,
        }),
    ).toThrow(/not in schema/);
  });
});
