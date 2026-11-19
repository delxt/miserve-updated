import { describe, expect, it } from "vitest";
import { csvEscape, parseRange } from "./report-range";

describe("parseRange", () => {
  it("uses Manila midnight and makes the end date inclusive", () => {
    const r = parseRange("2026-03-01", "2026-03-31");
    expect(r.from.toISOString()).toBe("2026-02-28T16:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-03-31T16:00:00.000Z");
  });
  it("swaps a backwards range to a single day", () => {
    const r = parseRange("2026-03-10", "2026-03-01");
    expect(r.toStr).toBe("2026-03-10");
  });
  it("ignores junk input", () => {
    const r = parseRange("drop table", "x");
    expect(r.fromStr).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe("csvEscape", () => {
  it("quotes commas and quotes", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
  });
  it("neutralises formulas", () => {
    expect(csvEscape("=SUM(A1)")).toBe("'=SUM(A1)");
  });
  it("handles empty values", () => {
    expect(csvEscape(null)).toBe("");
  });
});
