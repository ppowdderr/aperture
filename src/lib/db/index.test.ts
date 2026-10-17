import { afterEach, describe, expect, it, vi } from "vitest";
import { connectDb } from "./index";

describe("connectDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects with a clear message when MONGODB_URI is unset", async () => {
    vi.stubEnv("MONGODB_URI", "");

    await expect(connectDb()).rejects.toThrow("MONGODB_URI missing");
  });
});
