import { describe, expect, it } from "vitest";
import { buildHostedAuthLinkInput, parseHostedAuthCallback } from "@/server/unipile/connection";

describe("LinkedIn connect URL flow", () => {
  it("builds a hosted auth payload scoped to LinkedIn and the current app user", () => {
    const input = buildHostedAuthLinkInput({
      user: {
        id: "user_1",
        email: "daniel@example.com"
      },
      appBaseUrl: "https://app.example.com/",
      expiresOn: new Date("2026-04-29T22:00:00Z")
    });

    expect(input).toMatchObject({
      type: "create",
      providers: ["LINKEDIN"],
      successRedirectUrl: "https://app.example.com/linkedin/connected",
      failureRedirectUrl: "https://app.example.com/linkedin/error",
      notifyUrl: "https://app.example.com/api/linkedin/connection-callback",
      name: "user_1"
    });
  });

  it("builds reconnect payload with the target account id", () => {
    expect(
      buildHostedAuthLinkInput({
        user: { id: "user_1", email: "daniel@example.com" },
        appBaseUrl: "https://app.example.com",
        expiresOn: new Date("2026-04-29T22:00:00Z"),
        reconnectAccountId: "unipile_acct_1"
      })
    ).toMatchObject({
      type: "reconnect",
      reconnectAccount: "unipile_acct_1"
    });
  });
});

describe("LinkedIn connection callback", () => {
  it("parses successful hosted auth callbacks", () => {
    expect(
      parseHostedAuthCallback({
        status: "CREATION_SUCCESS",
        account_id: "acct_1",
        name: "user_1"
      })
    ).toEqual({
      status: "CREATION_SUCCESS",
      account_id: "acct_1",
      name: "user_1"
    });
  });

  it("rejects successful callbacks without account_id", () => {
    expect(() => parseHostedAuthCallback({ status: "CREATION_SUCCESS", name: "user_1" })).toThrow(/account_id/i);
  });
});
