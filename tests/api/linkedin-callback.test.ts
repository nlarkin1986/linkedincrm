import { describe, expect, it } from "vitest";
import { parseHostedAuthCallback } from "@/server/unipile/connection";
import { handleHostedAuthCallback } from "@/server/linkedin/connection-callback";

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

  it("persists successful hosted auth callbacks and queues initial sync", async () => {
    const sent: unknown[] = [];
    const result = await handleHostedAuthCallback({
      payload: {
        status: "CREATION_SUCCESS",
        account_id: "unipile_account_1",
        name: "user_1"
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
        name: "linkedin/account.sync_initial",
        data: { linkedinAccountId: "linkedin_account_1" }
      }
    ]);
  });
});
