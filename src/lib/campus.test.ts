import { describe, expect, it } from "vitest";
import { campusFor } from "./campus";

describe("campusFor", () => {
  it("maps central campus room descriptions", () => {
    expect(campusFor("JCMB 5327")).toBe("kb");
    expect(campusFor("AT 2.11")).toBe("central");
    expect(campusFor("2.35 | Hybrid teaching space - Edinburgh Futures Institute (EFI)")).toBe(
      "central",
    );
  });

  it("maps King's Buildings room descriptions", () => {
    expect(campusFor("Lecture Theatre - Nucleus")).toBe("kb");
    expect(campusFor("JCMB Lecture Theatre A")).toBe("kb");
    expect(campusFor("G.04 - Murchison House")).toBe("kb");
  });

  it("returns other for unknown rooms", () => {
    expect(campusFor("Remote")).toBe("other");
    expect(campusFor("")).toBe("other");
  });
});
