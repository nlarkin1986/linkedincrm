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
});
