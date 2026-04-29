import { describe, expect, it } from "vitest";
import { getFreshnessBucket } from "@/server/relationships/freshness";

describe("freshness bucket", () => {
  const now = new Date("2026-04-29T18:00:00Z");

  it("maps null activity to no_activity", () => {
    expect(getFreshnessBucket(null, now)).toBe("no_activity");
  });

  it("maps activity within 3 calendar days to fresh", () => {
    expect(getFreshnessBucket(new Date("2026-04-27T01:00:00Z"), now)).toBe("fresh");
  });

  it("maps activity 4-7 days ago to warm", () => {
    expect(getFreshnessBucket(new Date("2026-04-23T12:00:00Z"), now)).toBe("warm");
  });

  it("maps activity 8-14 days ago to cooling", () => {
    expect(getFreshnessBucket(new Date("2026-04-17T12:00:00Z"), now)).toBe("cooling");
  });

  it("maps older activity to stale", () => {
    expect(getFreshnessBucket(new Date("2026-04-01T12:00:00Z"), now)).toBe("stale");
  });
});
