import { describe, expect, it, vi } from "vitest";
import { syncLinkedInAccountInitial, type LinkedInSyncAccount, type LinkedInSyncStore } from "@/server/jobs/linkedin-sync";
import type { PersonRecord, PersonUpsertInput } from "@/server/relationships/person-upsert";
import type { RelationshipRecord } from "@/server/db/repositories/relationships";
import type { LinkedInChatRecord } from "@/server/db/repositories/chats";
import type { LinkedInMessageRecord } from "@/server/db/repositories/messages";
import type { RelationshipMessage } from "@/server/relationships/recompute";

describe("syncLinkedInAccountInitial", () => {
  it("imports chats, attendees, messages, and recomputes affected relationships idempotently", async () => {
    const store = createMemoryStore();
    const unipile = {
      resyncAccount: vi.fn(async () => ({ status: "complete" })),
      listChats: vi.fn(async () => ({
        items: [
          {
            id: "chat_1",
            type: "one_to_one",
            attendees: [
              { id: "att_rep", attendee_provider_id: "rep_provider", name: "Daniel Torres" },
              {
                id: "att_buyer",
                attendee_provider_id: "buyer_provider",
                profile: {
                  full_name: "Jane Buyer",
                  headline: "VP Customer Experience",
                  public_identifier: "jane-buyer",
                  profile_url: "https://linkedin.com/in/jane-buyer"
                }
              }
            ]
          }
        ],
        cursor: null
      })),
      listMessagesForChat: vi.fn(async () => ({
        items: [
          {
            id: "msg_1",
            text: "Saw your CX work at 2K.",
            sent_at: "2026-04-20T12:00:00Z",
            sender: { attendee_provider_id: "rep_provider", name: "Daniel Torres" }
          },
          {
            id: "msg_2",
            text: "Interesting. Send details.",
            sent_at: "2026-04-24T12:00:00Z",
            sender: { attendee_provider_id: "buyer_provider", name: "Jane Buyer" }
          }
        ],
        cursor: null
      })),
      listMessages: vi.fn()
    };

    const first = await syncLinkedInAccountInitial({
      account: account(),
      unipile,
      store,
      now: new Date("2026-04-29T12:00:00Z")
    });
    const second = await syncLinkedInAccountInitial({
      account: account(),
      unipile,
      store,
      now: new Date("2026-04-29T12:00:00Z")
    });

    expect(first).toEqual({ importedChatCount: 1, importedMessageCount: 2, affectedRelationshipCount: 1 });
    expect(second).toEqual({ importedChatCount: 1, importedMessageCount: 2, affectedRelationshipCount: 1 });
    expect(store.people.size).toBe(1);
    expect(store.chats.size).toBe(1);
    expect(store.messages.size).toBe(2);
    expect(store.relationships.size).toBe(1);
    expect([...store.relationshipStates.values()][0]).toMatchObject({
      relationshipStage: "replied",
      freshnessBucket: "warm",
      hasReplied: true,
      lastMessagePreview: "Interesting. Send details."
    });
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

function createMemoryStore(): LinkedInSyncStore & {
  people: Map<string, PersonRecord>;
  chats: Map<string, LinkedInChatRecord>;
  messages: Map<string, LinkedInMessageRecord>;
  relationships: Map<string, RelationshipRecord>;
  relationshipStates: Map<string, unknown>;
} {
  const people = new Map<string, PersonRecord>();
  const chats = new Map<string, LinkedInChatRecord>();
  const messages = new Map<string, LinkedInMessageRecord>();
  const relationships = new Map<string, RelationshipRecord>();
  const relationshipStates = new Map<string, unknown>();

  return {
    people,
    chats,
    messages,
    relationships,
    relationshipStates,
    async upsertPerson(input: PersonUpsertInput) {
      const key = input.linkedinProviderId ?? input.linkedinPublicIdentifier ?? input.fullName;
      const person = people.get(key) ?? { id: `person_${people.size + 1}`, ...input };
      people.set(key, person);
      return person;
    },
    async upsertRelationship(input) {
      const key = `${input.userId}:${input.personId}`;
      const relationship = relationships.get(key) ?? {
        id: `relationship_${relationships.size + 1}`,
        userId: input.userId,
        linkedinAccountId: input.linkedinAccountId,
        personId: input.personId,
        relationshipStatus: input.relationshipStatus,
        relationshipStage: "needs_review",
        freshnessBucket: "no_activity",
        lastActivityAt: null,
        lastOutboundAt: null,
        lastInboundAt: null,
        hasReplied: false,
        manualResponded: false,
        doNotContact: false,
        snoozedUntil: null
      };
      relationships.set(key, relationship);
      return relationship;
    },
    async upsertChat(input) {
      const chat = chats.get(input.unipileChatId) ?? {
        id: `chat_${chats.size + 1}`,
        userId: input.userId,
        linkedinAccountId: input.linkedinAccountId,
        personId: input.personId,
        unipileChatId: input.unipileChatId,
        isGroup: input.isGroup,
        lastMessageAt: input.lastMessageAt,
        lastMessageDirection: input.lastMessageDirection
      };
      chats.set(input.unipileChatId, chat);
      return chat;
    },
    async upsertMessage(input) {
      const message = messages.get(input.unipileMessageId) ?? {
        id: `message_${messages.size + 1}`,
        userId: input.userId,
        linkedinAccountId: input.linkedinAccountId,
        linkedinChatId: input.linkedinChatId,
        personId: input.personId,
        unipileMessageId: input.unipileMessageId,
        direction: input.direction,
        body: input.body,
        sentAt: input.sentAt
      };
      messages.set(input.unipileMessageId, message);
      return message;
    },
    async findChatByUnipileId(input) {
      return chats.get(input.unipileChatId) ?? null;
    },
    async findRelationship(input) {
      return relationships.get(`${input.userId}:${input.personId}`) ?? null;
    },
    async listRelationshipMessages(input) {
      return [...messages.values()]
        .filter((message) => message.userId === input.userId && message.personId === input.personId)
        .map<RelationshipMessage>((message) => ({
          direction: message.direction,
          body: message.body,
          sentAt: message.sentAt
        }));
    },
    async updateRelationshipState(input) {
      relationshipStates.set(input.relationshipId, input);
    },
    async markAccountSynced() {}
  };
}
