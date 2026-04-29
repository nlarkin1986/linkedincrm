import { describe, expect, it } from "vitest";
import { appUserFromSession, AuthenticationError, requireAuthIdentity } from "@/server/auth/session";
import { reconcileAppUser } from "@/server/auth/app-user";

describe("auth session", () => {
  it("requires an authenticated identity", () => {
    expect(() => requireAuthIdentity({ user: null })).toThrow(AuthenticationError);
  });

  it("maps session identity into an app user", () => {
    expect(
      appUserFromSession({
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "Daniel@Example.COM",
          fullName: "Daniel Torres"
        }
      })
    ).toMatchObject({
      authUserId: "00000000-0000-0000-0000-000000000001",
      email: "daniel@example.com",
      fullName: "Daniel Torres"
    });
  });

  it("reconciles mutable email without changing the app user id", () => {
    const user = reconcileAppUser(
      {
        id: "app_1",
        authUserId: "auth_1",
        email: "old@example.com",
        fullName: "Daniel",
        role: "ae"
      },
      {
        id: "auth_1",
        email: "NEW@example.com",
        fullName: "Daniel Torres"
      }
    );

    expect(user).toMatchObject({
      id: "app_1",
      authUserId: "auth_1",
      email: "new@example.com",
      fullName: "Daniel Torres"
    });
  });
});
