import { describe, expect, it } from "vitest";
import { AuthenticationError, requireAuthIdentity } from "@/server/auth/session";
import { assertOwnsRecord } from "@/server/auth/ownership";
import { extractBearerToken, requireRequestAuthIdentity } from "@/server/auth/request-session";
import { appUserOwnershipIdentity, requireRequestAppUser } from "@/server/auth/request-app-user";
import { safeRelativeRedirect } from "@/server/http/app-origin";

describe("authenticated route access", () => {
  it("rejects unauthenticated requests before record lookup", () => {
    expect(() => requireAuthIdentity({ user: null })).toThrow(AuthenticationError);
  });

  it("verifies ownership before mutating relationship state", () => {
    expect(() => assertOwnsRecord("user_1", { userId: "user_2", id: "rel_1" }, "relationship")).toThrow();
  });

  it("ignores spoofable x-auth headers and requires bearer session auth", async () => {
    const headers = new Headers({
      "x-auth-user-id": "user_1",
      "x-auth-email": "daniel@example.com"
    });

    expect(extractBearerToken(headers)).toBeNull();
    await expect(
      requireRequestAuthIdentity(new Request("https://app.example.com", { headers }), {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        getUser: async () => {
          throw new Error("should not be called");
        }
      })
    ).rejects.toThrow(AuthenticationError);
  });

  it("accepts identity only from a verified bearer token", async () => {
    const user = await requireRequestAuthIdentity(
      new Request("https://app.example.com", {
        headers: { authorization: "Bearer token_1" }
      }),
      {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        getUser: async (token) => ({
          data: {
            user: {
              id: "user_1",
              email: "daniel@example.com",
              user_metadata: { full_name: "Daniel Torres" }
            }
          },
          error: token === "token_1" ? null : new Error("bad token")
        })
      }
    );

    expect(user).toEqual({
      id: "user_1",
      email: "daniel@example.com",
      fullName: "Daniel Torres"
    });
  });

  it("rejects absolute and protocol-relative callback redirects", () => {
    expect(safeRelativeRedirect("https://evil.example.com")).toBe("/");
    expect(safeRelativeRedirect("//evil.example.com")).toBe("/");
    expect(safeRelativeRedirect("/settings/linkedin?connected=1")).toBe("/settings/linkedin?connected=1");
  });

  it("persists the verified auth identity before returning an app-owned user", async () => {
    const seen: unknown[] = [];
    const result = await requireRequestAppUser(
      new Request("https://app.example.com", {
        headers: { authorization: "Bearer token_1" }
      }),
      {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        getUser: async () => ({
          data: {
            user: {
              id: "00000000-0000-0000-0000-000000000001",
              email: "NATE@Example.COM",
              user_metadata: { full_name: "Nate Larkin" }
            }
          },
          error: null
        }),
        upsertAppUser: async (identity) => {
          seen.push(identity);
          return {
            id: "11111111-1111-1111-1111-111111111111",
            authUserId: identity.id,
            email: identity.email.toLowerCase(),
            fullName: identity.fullName ?? null,
            role: "ae"
          };
        }
      }
    );

    expect(seen).toEqual([
      {
        id: "00000000-0000-0000-0000-000000000001",
        email: "NATE@Example.COM",
        fullName: "Nate Larkin"
      }
    ]);
    expect(appUserOwnershipIdentity(result.appUser)).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "nate@example.com",
      fullName: "Nate Larkin"
    });
  });

  it("does not persist an app user when bearer auth is missing", async () => {
    let called = false;

    await expect(
      requireRequestAppUser(new Request("https://app.example.com"), {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        upsertAppUser: async () => {
          called = true;
          throw new Error("should not be called");
        }
      })
    ).rejects.toThrow(AuthenticationError);
    expect(called).toBe(false);
  });
});
