import { describe, expect, it } from "vitest";
import {
  expectedUnipileWebhookRegistrations,
  verifyUnipileWebhookRegistrations
} from "@/server/unipile/webhook-registration";

describe("Unipile webhook registration audit", () => {
  it("builds expected callback URLs from the app origin", () => {
    expect(expectedUnipileWebhookRegistrations("https://app.example.com/").map((entry) => entry.callbackUrl)).toEqual([
      "https://app.example.com/api/webhooks/unipile/messaging",
      "https://app.example.com/api/webhooks/unipile/account-status",
      "https://app.example.com/api/webhooks/unipile/users"
    ]);
  });

  it("reports configured webhooks without exposing header secret values", async () => {
    const audit = await verifyUnipileWebhookRegistrations({
      appBaseUrl: "https://app.example.com",
      client: {
        async listWebhooks() {
          return {
            items: [
              webhook("wh_msg", "messaging", "/api/webhooks/unipile/messaging"),
              webhook("wh_status", "account_status", "/api/webhooks/unipile/account-status"),
              webhook("wh_users", "new_relation", "/api/webhooks/unipile/users")
            ]
          };
        }
      }
    });

    expect(audit.map((entry) => entry.status)).toEqual(["configured", "configured", "configured"]);
    expect(JSON.stringify(audit)).not.toContain("webhook-secret");
  });

  it("classifies missing, wrong-url, and missing-auth-header registrations", async () => {
    const audit = await verifyUnipileWebhookRegistrations({
      appBaseUrl: "https://app.example.com",
      client: {
        async listWebhooks() {
          return {
            items: [
              webhook("wh_msg", "messaging", "https://old.example.com/api/webhooks/unipile/messaging"),
              {
                id: "wh_status",
                events: ["account_status"],
                request_url: "https://app.example.com/api/webhooks/unipile/account-status",
                headers: {}
              }
            ]
          };
        }
      }
    });

    expect(audit).toMatchObject([
      { key: "messaging", status: "wrong-url" },
      { key: "account-status", status: "missing-auth-header" },
      { key: "users", status: "missing" }
    ]);
  });
});

function webhook(id: string, event: string, pathOrUrl: string) {
  return {
    id,
    events: [event],
    request_url: pathOrUrl.startsWith("http") ? pathOrUrl : `https://app.example.com${pathOrUrl}`,
    headers: [
      {
        key: "Unipile-Auth",
        value: "webhook-secret"
      }
    ]
  };
}
