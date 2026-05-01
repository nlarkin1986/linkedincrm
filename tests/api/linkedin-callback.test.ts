import { describe, expect, it } from "vitest";
import { POST as postConnectionCallback } from "../../app/api/linkedin/connection-callback/route";
import { createHostedAuthClaimToken, parseHostedAuthCallback } from "@/server/unipile/connection";
import { handleHostedAuthCallback } from "@/server/linkedin/connection-callback";
import { claimConnectedLinkedInAccount } from "@/server/linkedin/claim-connected-account";

describe("connection callback parsing", () => {
  it("accepts reconnect callbacks", () => {
    expect(
      parseHostedAuthCallback({
        status: "RECONNECTED",
        account_id: "acct_1",
        name: "app_user_1"
      })
    ).toMatchObject({
      status: "RECONNECTED",
      account_id: "acct_1"
    });
  });

  it("rejects unknown callback status", () => {
    expect(() => parseHostedAuthCallback({ status: "OK" })).toThrow(/valid status/i);
  });

  it("rejects hosted auth callbacks when the webhook secret is not configured", async () => {
    const previousSecret = process.env.UNIPILE_WEBHOOK_SECRET;
    delete process.env.UNIPILE_WEBHOOK_SECRET;

    const response = await postConnectionCallback(
      new Request("https://app.example.com/api/linkedin/connection-callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "CREATION_SUCCESS",
          account_id: "unipile_account_1",
          name: "app_user_1"
        })
      })
    );

    if (previousSecret) process.env.UNIPILE_WEBHOOK_SECRET = previousSecret;
    expect(response.status).toBe(401);
  });

  it("rejects hosted auth callbacks with the wrong webhook secret", async () => {
    const previousSecret = process.env.UNIPILE_WEBHOOK_SECRET;
    process.env.UNIPILE_WEBHOOK_SECRET = "webhook-secret";

    const response = await postConnectionCallback(
      new Request("https://app.example.com/api/linkedin/connection-callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Unipile-Auth": "wrong-secret"
        },
        body: JSON.stringify({
          status: "CREATION_SUCCESS",
          account_id: "unipile_account_1",
          name: "app_user_1"
        })
      })
    );

    if (previousSecret) {
      process.env.UNIPILE_WEBHOOK_SECRET = previousSecret;
    } else {
      delete process.env.UNIPILE_WEBHOOK_SECRET;
    }
    expect(response.status).toBe(401);
  });

  it("persists successful hosted auth callbacks and queues initial sync", async () => {
    const sent: unknown[] = [];
    const result = await handleHostedAuthCallback({
      payload: {
        status: "CREATION_SUCCESS",
        account_id: "unipile_account_1",
        name: "app_user_1"
      },
      store: {
        async upsertLinkedInAccountFromHostedAuth(input) {
          return {
            id: "linkedin_account_1",
            userId: input.userId,
            unipileAccountId: input.unipileAccountId,
            status: input.status,
            reconnectRequired: false
          };
        }
      },
      queue: {
        async send(input) {
          sent.push(input);
        }
      }
    });

    expect(result).toMatchObject({
      linkedinAccountId: "linkedin_account_1",
      queuedInitialSync: true
    });
    expect(sent).toEqual([
      {
        id: "linkedin.account.sync_initial:unipile_account_1",
        name: "linkedin/account.sync_initial",
        data: { linkedinAccountId: "linkedin_account_1" }
      }
    ]);
  });
});

describe("connected account claim", () => {
  it("links a verified Unipile account to the signed-in user and queues initial sync", async () => {
    const sent: unknown[] = [];
    const token = createHostedAuthClaimToken({
      userId: "app_user_1",
      expiresOn: new Date("2026-04-29T22:00:00Z"),
      secret: "secret"
    });

    const result = await claimConnectedLinkedInAccount({
      user: { id: "app_user_1", email: "nate@example.com" },
      accountId: "unipile_account_1",
      claimToken: token,
      claimSecret: "secret",
      now: new Date("2026-04-29T21:59:00Z"),
      store: {
        async upsertLinkedInAccountFromHostedAuth(input) {
          return {
            id: "linkedin_account_1",
            userId: input.userId,
            unipileAccountId: input.unipileAccountId,
            status: input.status,
            reconnectRequired: false
          };
        }
      },
      unipile: {
        async getAccount(accountId) {
          return { id: accountId };
        }
      },
      queue: {
        async send(input) {
          sent.push(input);
        }
      }
    });

    expect(result).toMatchObject({
      linkedinAccountId: "linkedin_account_1",
      queuedInitialSync: true
    });
    expect(sent).toEqual([
      {
        id: "linkedin.account.sync_initial:unipile_account_1",
        name: "linkedin/account.sync_initial",
        data: { linkedinAccountId: "linkedin_account_1" }
      }
    ]);
  });

  it("rejects a claim token for a different signed-in user", async () => {
    const token = createHostedAuthClaimToken({
      userId: "app_user_1",
      expiresOn: new Date("2026-04-29T22:00:00Z"),
      secret: "secret"
    });

    await expect(
      claimConnectedLinkedInAccount({
        user: { id: "app_user_2", email: "maya@example.com" },
        accountId: "unipile_account_1",
        claimToken: token,
        claimSecret: "secret",
        now: new Date("2026-04-29T21:59:00Z"),
        store: {
          async upsertLinkedInAccountFromHostedAuth() {
            throw new Error("should not be called");
          }
        },
        unipile: {
          async getAccount() {
            throw new Error("should not be called");
          }
        },
        queue: {
          async send() {
            throw new Error("should not be called");
          }
        }
      })
    ).rejects.toThrow(/signed-in user/i);
  });
});
