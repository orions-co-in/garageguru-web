import { describe, expect, it } from "vitest";
import { formatInr, statusLabel } from "./money.js";

describe("GG-2 display helpers", () => {
  it("formats paise as INR", () => {
    expect(formatInr(320000)).toBe("₹3,200");
  });

  it("labels technician_en_route for the job card", () => {
    expect(statusLabel("technician_en_route")).toBe("Tech en route");
  });
});
