import { describe, expect, it } from "vitest";
import { parseAccountStatusWebhook } from "@/server/webhooks/unipile-events";

describe("parseAccountStatusWebhook", () => {
  it("flags credentials statuses for reconnect handling", () => {
    expect(
      parseAccountStatusWebhook({
        account_id: "acct_1",
        status: "CREDENTIALS",
        status_message: "User must reconnect"
      })
    ).toEqual({
      unipileAccountId: "acct_1",
      status: "CREDENTIALS",
      reconnectRequired: true,
      statusMessage: "User must reconnect"
    });
  });

  it("supports nested Unipile account lifecycle payloads", () => {
    expect(
      parseAccountStatusWebhook({
        AccountStatus: {
          account_id: "acct_1",
          message: "CREDENTIALS",
          reason: "Reconnect required"
        }
      })
    ).toEqual({
      unipileAccountId: "acct_1",
      status: "CREDENTIALS",
      reconnectRequired: true,
      statusMessage: "Reconnect required"
    });
  });

  it("does not treat sync success as reconnect required", () => {
    expect(
      parseAccountStatusWebhook({
        account_id: "acct_1",
        status: "SYNC_SUCCESS"
      })
    ).toEqual({
      unipileAccountId: "acct_1",
      status: "SYNC_SUCCESS",
      reconnectRequired: false,
      statusMessage: undefined
    });
  });
});
