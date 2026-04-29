import { describe, expect, it } from "vitest";
import { AuthenticationError, requireAuthIdentity } from "@/server/auth/session";
import { assertOwnsRecord } from "@/server/auth/ownership";

describe("authenticated route access", () => {
  it("rejects unauthenticated requests before record lookup", () => {
    expect(() => requireAuthIdentity({ user: null })).toThrow(AuthenticationError);
  });

  it("verifies ownership before mutating relationship state", () => {
    expect(() => assertOwnsRecord("user_1", { userId: "user_2", id: "rel_1" }, "relationship")).toThrow();
  });
});
