import { describe, expect, it } from "vitest";
import { parseHostedAuthCallback } from "@/server/unipile/connection";

describe("connection callback parsing", () => {
  it("accepts reconnect callbacks", () => {
    expect(
      parseHostedAuthCallback({
        status: "RECONNECTED",
        account_id: "acct_1",
        name: "user_1"
      })
    ).toMatchObject({
      status: "RECONNECTED",
      account_id: "acct_1"
    });
  });

  it("rejects unknown callback status", () => {
    expect(() => parseHostedAuthCallback({ status: "OK" })).toThrow(/valid status/i);
  });
});
