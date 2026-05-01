import { describe, expect, it } from "vitest";
import {
  buildHostedAuthLinkInput,
  createHostedAuthClaimToken,
  parseHostedAuthCallback,
  verifyHostedAuthClaimToken
} from "@/server/unipile/connection";
import { resolveReconnectUnipileAccountId } from "@/server/linkedin/connect-url";

describe("LinkedIn connect URL flow", () => {
  it("builds a hosted auth payload scoped to LinkedIn and the current app user", () => {
    const input = buildHostedAuthLinkInput({
      user: {
        id: "app_user_1",
        email: "nate@example.com"
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
      name: "app_user_1"
    });
  });

  it("builds reconnect payload with the target account id", () => {
    expect(
      buildHostedAuthLinkInput({
        user: { id: "app_user_1", email: "nate@example.com" },
        appBaseUrl: "https://app.example.com",
        expiresOn: new Date("2026-04-29T22:00:00Z"),
        reconnectAccountId: "unipile_acct_1"
      })
    ).toMatchObject({
      type: "reconnect",
      reconnectAccount: "unipile_acct_1"
    });
  });

  it("can include a signed claim token in the success redirect", () => {
    const input = buildHostedAuthLinkInput({
      user: { id: "app_user_1", email: "nate@example.com" },
      appBaseUrl: "https://app.example.com",
      expiresOn: new Date("2026-04-29T22:00:00Z"),
      claimToken: "claim_1"
    });

    expect(input.successRedirectUrl).toBe("https://app.example.com/linkedin/connected?claim_token=claim_1");
  });

  it("resolves reconnect requests through an owned local LinkedIn account", async () => {
    await expect(
      resolveReconnectUnipileAccountId({
        user: { id: "app_user_1", email: "nate@example.com" },
        reconnectAccountId: "linkedin_account_1",
        store: {
          findLinkedInAccountById: async () => ({
            id: "linkedin_account_1",
            userId: "app_user_1",
            unipileAccountId: "unipile_account_1",
            status: "CREDENTIALS",
            reconnectRequired: true
          })
        }
      })
    ).resolves.toBe("unipile_account_1");
  });

  it("rejects reconnect requests for another user's local LinkedIn account", async () => {
    await expect(
      resolveReconnectUnipileAccountId({
        user: { id: "app_user_1", email: "nate@example.com" },
        reconnectAccountId: "linkedin_account_2",
        store: {
          findLinkedInAccountById: async () => ({
            id: "linkedin_account_2",
            userId: "app_user_2",
            unipileAccountId: "unipile_account_2",
            status: "CREDENTIALS",
            reconnectRequired: true
          })
        }
      })
    ).rejects.toThrow(/cannot access/i);
  });

  it("signs and verifies hosted auth claim tokens", () => {
    const token = createHostedAuthClaimToken({
      userId: "app_user_1",
      expiresOn: new Date("2026-04-29T22:00:00Z"),
      secret: "secret"
    });

    expect(
      verifyHostedAuthClaimToken({
        token,
        secret: "secret",
        now: new Date("2026-04-29T21:59:00Z")
      })
    ).toMatchObject({
      userId: "app_user_1",
      expiresAt: new Date("2026-04-29T22:00:00Z")
    });
    expect(() =>
      verifyHostedAuthClaimToken({
        token,
        secret: "secret",
        now: new Date("2026-04-29T22:01:00Z")
      })
    ).toThrow(/expired/i);
  });
});

describe("LinkedIn connection callback", () => {
  it("parses successful hosted auth callbacks", () => {
    expect(
      parseHostedAuthCallback({
        status: "CREATION_SUCCESS",
        account_id: "acct_1",
        name: "app_user_1"
      })
    ).toEqual({
      status: "CREATION_SUCCESS",
      account_id: "acct_1",
      name: "app_user_1"
    });
  });

  it("rejects successful callbacks without account_id", () => {
    expect(() => parseHostedAuthCallback({ status: "CREATION_SUCCESS", name: "app_user_1" })).toThrow(/account_id/i);
  });
});
