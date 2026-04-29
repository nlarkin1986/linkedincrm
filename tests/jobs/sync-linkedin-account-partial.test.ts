import { describe, expect, it, vi } from "vitest";
import { syncLinkedInAccountPartial, type LinkedInSyncAccount, type LinkedInSyncStore } from "@/server/jobs/linkedin-sync";
import type { RelationshipMessage } from "@/server/relationships/recompute";

describe("syncLinkedInAccountPartial", () => {
  it("persists fetched messages and recomputes affected relationships before marking synced", async () => {
    const messages: RelationshipMessage[] = [
      {
        direction: "outbound",
        body: "Checking back in.",
        sentAt: new Date("2026-04-20T12:00:00Z")
      }
    ];
    const stateUpdates: unknown[] = [];
    const store: Pick<
      LinkedInSyncStore,
      | "findChatByUnipileId"
      | "findRelationship"
      | "listRelationshipMessages"
      | "markAccountSynced"
      | "updateRelationshipState"
      | "upsertMessage"
    > = {
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
      async upsertMessage(input) {
        messages.push({
          direction: input.direction,
          body: input.body,
          sentAt: input.sentAt
        });
        return {
          id: "message_2",
          userId: input.userId,
          linkedinAccountId: input.linkedinAccountId,
          linkedinChatId: input.linkedinChatId,
          personId: input.personId,
          unipileMessageId: input.unipileMessageId,
          direction: input.direction,
          body: input.body,
          sentAt: input.sentAt
        };
      },
      async listRelationshipMessages() {
        return messages;
      },
      async updateRelationshipState(input) {
        stateUpdates.push(input);
      },
      markAccountSynced: vi.fn(async () => {})
    };
    const unipile = {
      resyncAccount: vi.fn(async () => ({})),
      listMessages: vi.fn(async () => ({
        items: [
          {
            id: "msg_2",
            chat_id: "chat_1",
            text: "Happy to talk.",
            sent_at: "2026-04-24T12:00:00Z",
            sender: { attendee_provider_id: "buyer_provider" }
          }
        ],
        cursor: null
      })),
      listChats: vi.fn(),
      listMessagesForChat: vi.fn()
    };

    const result = await syncLinkedInAccountPartial({
      account: account(),
      unipile,
      store,
      after: new Date("2026-04-21T00:00:00Z"),
      now: new Date("2026-04-29T12:00:00Z")
    });

    expect(result).toMatchObject({
      fetchedMessageCount: 1,
      importedMessageCount: 1,
      affectedRelationshipCount: 1
    });
    expect(stateUpdates[0]).toMatchObject({
      relationshipId: "relationship_1",
      relationshipStage: "replied",
      hasReplied: true
    });
    expect(store.markAccountSynced).toHaveBeenCalledOnce();
  });
});

function account(): LinkedInSyncAccount {
  return {
    id: "linkedin_account_1",
    userId: "user_1",
    unipileAccountId: "unipile_account_1",
    status: "OK",
    reconnectRequired: false,
    accountUserProviderId: "rep_provider"
  };
}
