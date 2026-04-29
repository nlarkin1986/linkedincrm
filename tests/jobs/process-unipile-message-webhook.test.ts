import { describe, expect, it } from "vitest";
import { processUnipileMessagingWebhook, type MessagingWebhookProcessingStore } from "@/server/webhooks/unipile-events";
import type { RelationshipMessage } from "@/server/relationships/recompute";

describe("processUnipileMessagingWebhook", () => {
  it("records inbound replies, recomputes the relationship, and queues a reply notification", async () => {
    const messages: RelationshipMessage[] = [
      {
        direction: "outbound",
        body: "Saw your team is working on customer experience.",
        sentAt: new Date("2026-04-20T12:00:00Z")
      }
    ];
    const relationshipStates: unknown[] = [];
    const notifications: unknown[] = [];
    const store: MessagingWebhookProcessingStore = {
      async upsertWebhookEvent(input) {
        expect(input.eventType).toBe("messaging");
        return { id: "webhook_event_1" };
      },
      async findLinkedInAccountByUnipileId() {
        return {
          id: "linkedin_account_1",
          userId: "user_1",
          accountUserProviderId: "rep_provider"
        };
      },
      async findChatByUnipileId() {
        return {
          id: "chat_row_1",
          userId: "user_1",
          linkedinAccountId: "linkedin_account_1",
          personId: "person_1",
          unipileChatId: "chat_1",
          isGroup: false,
          lastMessageAt: null,
          lastMessageDirection: null
        };
      },
      async upsertMessage(input) {
        messages.push({
          direction: input.direction,
          body: input.body,
          sentAt: input.sentAt
        });
        return { personId: input.personId };
      },
      async findRelationship() {
        return {
          id: "relationship_1",
          userId: "user_1",
          linkedinAccountId: "linkedin_account_1",
          personId: "person_1",
          relationshipStatus: "connected",
          relationshipStage: "dm_sent_no_reply",
          freshnessBucket: "cooling",
          lastActivityAt: new Date("2026-04-20T12:00:00Z"),
          lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
          lastInboundAt: null,
          hasReplied: false,
          manualResponded: false,
          doNotContact: false,
          snoozedUntil: null
        };
      },
      async listRelationshipMessages() {
        return messages;
      },
      async updateRelationshipState(input) {
        relationshipStates.push(input);
      },
      async enqueueReplyNotification(input) {
        notifications.push(input);
      }
    };

    const result = await processUnipileMessagingWebhook({
      payload: {
        id: "event_1",
        account_id: "unipile_account_1",
        chat_id: "chat_1",
        account_info: { user_id: "rep_provider" },
        message: {
          id: "msg_2",
          text: "Happy to chat next week.",
          sent_at: "2026-04-24T12:00:00Z",
          sender: { attendee_provider_id: "buyer_provider", name: "Jane Buyer" }
        }
      },
      store,
      now: new Date("2026-04-29T12:00:00Z")
    });

    expect(result).toMatchObject({
      direction: "inbound",
      relationshipUpdated: true
    });
    expect(relationshipStates[0]).toMatchObject({
      relationshipStage: "replied",
      freshnessBucket: "warm",
      hasReplied: true
    });
    expect(notifications[0]).toMatchObject({
      userId: "user_1",
      relationshipId: "relationship_1",
      personId: "person_1",
      messagePreview: "Happy to chat next week."
    });
  });
});
