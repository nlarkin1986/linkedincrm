import { describe, expect, it } from "vitest";
import { readOptionalServerEnv, readServerEnv } from "@/server/config/env";

describe("server env", () => {
  it("fails fast with missing variable names", () => {
    expect(() => readServerEnv({})).toThrow(/DATABASE_URL/);
    expect(() => readServerEnv({})).toThrow(/UNIPILE_API_KEY/);
  });

  it("reads all required variables", () => {
    const env = readServerEnv({
      DATABASE_URL: "postgres://local",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      APP_BASE_URL: "https://app.example.com",
      UNIPILE_DSN: "api1.unipile.com:12345",
      UNIPILE_API_KEY: "unipile",
      UNIPILE_WEBHOOK_SECRET: "secret",
      INNGEST_EVENT_KEY: "event",
      INNGEST_SIGNING_KEY: "signing",
      AI_API_KEY: "ai"
    });

    expect(env.UNIPILE_API_KEY).toBe("unipile");
  });

  it("can read optional values without throwing", () => {
    expect(readOptionalServerEnv({ UNIPILE_API_KEY: "token" })).toEqual({
      UNIPILE_API_KEY: "token"
    });
  });
});
