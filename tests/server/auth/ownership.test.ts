import { describe, expect, it } from "vitest";
import { assertOwnsRecord, canAccessAccountMap } from "@/server/auth/ownership";
import { requireAdmin } from "@/server/auth/permissions";

describe("ownership", () => {
  it("allows owners to access their records", () => {
    expect(assertOwnsRecord("user_1", { userId: "user_1", id: "rel_1" })).toEqual({
      userId: "user_1",
      id: "rel_1"
    });
  });

  it("blocks non-owners without leaking details", () => {
    expect(() => assertOwnsRecord("user_1", { userId: "user_2" }, "relationship")).toThrow(
      /cannot access relationship/i
    );
  });

  it("requires admin role for admin-only access", () => {
    expect(() => requireAdmin({ role: "ae" })).toThrow(/admin access/i);
    expect(() => requireAdmin({ role: "admin" })).not.toThrow();
  });

  it("allows account owner or admin to access account maps", () => {
    expect(canAccessAccountMap("user_1", { ownerUserId: "user_1" })).toBe(true);
    expect(canAccessAccountMap("user_1", { ownerUserId: "user_2" })).toBe(false);
    expect(canAccessAccountMap("user_1", { ownerUserId: "user_2" }, true)).toBe(true);
  });
});
