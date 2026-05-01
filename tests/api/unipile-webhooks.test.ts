import { beforeEach, describe, expect, it } from "vitest";
import { POST as postMessagingWebhook } from "../../app/api/webhooks/unipile/messaging/route";
import { POST as postUsersWebhook } from "../../app/api/webhooks/unipile/users/route";
import { POST as postAccountStatusWebhook } from "../../app/api/webhooks/unipile/account-status/route";
import { acceptUnipileWebhook } from "@/server/webhooks/unipile-route";

describe("Unipile webhook routes", () => {
  beforeEach(() => {
    process.env.UNIPILE_WEBHOOK_SECRET = "webhook-secret";
  });

  it("rejects webhooks without the configured secret", async () => {
    const response = await postMessagingWebhook(request({ account_id: "acct_1" }, "wrong-secret"));

    expect(response.status).toBe(401);
  });

  it("accepts messaging webhooks and records the raw event envelope", async () => {
    const response = await postMessagingWebhook(request({ account_id: "acct_1", id: "event_1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      accepted: true,
      event: {
        eventType: "messaging",
        unipileAccountId: "acct_1",
        externalEventId: "event_1",
        processingStatus: "pending"
      }
    });
  });

  it("accepts Unipile's documented auth header", async () => {
    const response = await postMessagingWebhook(
      new Request("https://app.example.com/api/webhooks/unipile/messaging", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Unipile-Auth": "webhook-secret"
        },
        body: JSON.stringify({ account_id: "acct_1", id: "event_1" })
      })
    );

    expect(response.status).toBe(200);
  });

  it("parses new relation webhooks", async () => {
    const response = await postUsersWebhook(
      request({
        account_id: "acct_1",
        user_provider_id: "provider_1",
        user_public_identifier: "jane-buyer",
        user_profile_url: "https://linkedin.com/in/jane-buyer",
        user_full_name: "Jane Buyer"
      })
    );
    const body = await response.json();

    expect(body.relation).toMatchObject({
      unipileAccountId: "acct_1",
      userProviderId: "provider_1",
      userFullName: "Jane Buyer"
    });
  });

  it("marks non-OK account statuses as reconnect required", async () => {
    const response = await postAccountStatusWebhook(
      request({
        account_id: "acct_1",
        status: "CREDENTIALS",
        message: "Reconnect required"
      })
    );
    const body = await response.json();

    expect(body.accountStatus).toMatchObject({
      unipileAccountId: "acct_1",
      status: "CREDENTIALS",
      reconnectRequired: true
    });
  });

  it("accepts documented nested account status payloads without forcing reconnect for sync success", async () => {
    const response = await postAccountStatusWebhook(
      request({
        AccountStatus: {
          account_id: "acct_1",
          message: "SYNC_SUCCESS"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accountStatus).toMatchObject({
      unipileAccountId: "acct_1",
      status: "SYNC_SUCCESS",
      reconnectRequired: false
    });
    expect(body.event).toMatchObject({
      unipileAccountId: "acct_1",
      processingStatus: "pending"
    });
  });

  it("durably stores and enqueues accepted webhook events", async () => {
    const stored: unknown[] = [];
    const queued: unknown[] = [];
    const event = await acceptUnipileWebhook({
      eventType: "messaging",
      queueEventName: "unipile/webhook.messaging",
      payload: { account_id: "acct_1", id: "event_1" },
      store: {
        async insertWebhookEvent(input) {
          stored.push(input);
          return { id: "webhook_event_1" };
        }
      },
      queue: {
        async send(input) {
          queued.push(input);
        }
      }
    });

    expect(event).toMatchObject({
      id: "webhook_event_1",
      eventType: "messaging",
      unipileAccountId: "acct_1"
    });
    expect(stored).toHaveLength(1);
    expect(queued).toEqual([
      {
        id: "unipile.webhook.messaging:webhook_event_1",
        name: "unipile/webhook.messaging",
        data: { webhookEventId: "webhook_event_1" }
      }
    ]);
  });

  it("does not enqueue duplicate external webhook events twice", async () => {
    const stored = new Map<string, { id: string }>();
    const queued: unknown[] = [];
    const store = {
      async insertWebhookEvent(input: { eventType: string; externalEventId: string | null }) {
        const key = `${input.eventType}:${input.externalEventId}`;
        const existing = stored.get(key);
        if (existing) return { ...existing, duplicate: true };
        const event = { id: "webhook_event_1" };
        stored.set(key, event);
        return { ...event, duplicate: false };
      }
    };

    await acceptUnipileWebhook({
      eventType: "messaging",
      queueEventName: "unipile/webhook.messaging",
      payload: { account_id: "acct_1", id: "event_1" },
      store,
      queue: {
        async send(input) {
          queued.push(input);
        }
      }
    });
    const duplicate = await acceptUnipileWebhook({
      eventType: "messaging",
      queueEventName: "unipile/webhook.messaging",
      payload: { account_id: "acct_1", id: "event_1" },
      store,
      queue: {
        async send(input) {
          queued.push(input);
        }
      }
    });

    expect(stored).toHaveLength(1);
    expect(queued).toHaveLength(1);
    expect(duplicate).toMatchObject({ id: "webhook_event_1", duplicate: true });
  });
});

function request(payload: Record<string, unknown>, secret = "webhook-secret") {
  return new Request("https://app.example.com/api/webhooks/unipile/messaging", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-unipile-webhook-secret": secret
    },
    body: JSON.stringify(payload)
  });
}
