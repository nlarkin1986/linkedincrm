import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  linkedinAccounts,
  linkedinChats,
  linkedinMessages,
  linkedinRelationships,
  people,
  unipileWebhookEvents
} from "@/server/db/schema";
import type { MessagingWebhookProcessingStore } from "./unipile-events";
import { parseAccountStatusWebhook, parseNewRelationWebhook, processUnipileMessagingWebhook } from "./unipile-events";

export async function processStoredMessagingWebhook(db: Database, webhookEventId: string) {
  const payload = await loadWebhookPayload(db, webhookEventId);
  return processUnipileMessagingWebhook({
    payload,
    webhookEventId,
    store: createRuntimeMessagingWebhookStore(db)
  });
}

export async function processStoredAccountStatusWebhook(db: Database, webhookEventId: string) {
  const payload = await loadWebhookPayload(db, webhookEventId);
  const status = parseAccountStatusWebhook(payload);

  await db
    .update(linkedinAccounts)
    .set({
      status: status.status,
      statusMessage: status.statusMessage,
      reconnectRequired: status.reconnectRequired,
      lastWebhookAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(linkedinAccounts.unipileAccountId, status.unipileAccountId));
  await markWebhookProcessed(db, webhookEventId);

  return status;
}

export async function processStoredUserWebhook(db: Database, webhookEventId: string) {
  const payload = await loadWebhookPayload(db, webhookEventId);
  const relation = parseNewRelationWebhook(payload);
  const [account] = await db
    .select()
    .from(linkedinAccounts)
    .where(eq(linkedinAccounts.unipileAccountId, relation.unipileAccountId))
    .limit(1);
  if (!account) throw new Error("LinkedIn account not found");

  const [person] = await db
    .insert(people)
    .values({
      fullName: relation.userFullName,
      linkedinPublicIdentifier: relation.userPublicIdentifier,
      linkedinProviderId: relation.userProviderId,
      linkedinUrl: relation.userProfileUrl,
      source: "unipile_new_relation"
    })
    .returning();
  if (!person) throw new Error("Unable to persist new relation person");

  await db
    .insert(linkedinRelationships)
    .values({
      userId: account.userId,
      linkedinAccountId: account.id,
      personId: person.id,
      attendeeProviderId: relation.userProviderId,
      relationshipStatus: "connected",
      relationshipStage: "connected_no_dm",
      freshnessBucket: "no_activity"
    })
    .onConflictDoUpdate({
      target: [linkedinRelationships.userId, linkedinRelationships.personId],
      set: {
        relationshipStatus: "connected",
        attendeeProviderId: relation.userProviderId,
        updatedAt: new Date()
      }
    });
  await markWebhookProcessed(db, webhookEventId);

  return relation;
}

function createRuntimeMessagingWebhookStore(db: Database): MessagingWebhookProcessingStore {
  return {
    async upsertWebhookEvent(input) {
      const [event] = await db.insert(unipileWebhookEvents).values(input).returning({ id: unipileWebhookEvents.id });
      if (!event) throw new Error("Unable to persist webhook event");
      return event;
    },
    async findLinkedInAccountByUnipileId(unipileAccountId) {
      const [account] = await db
        .select()
        .from(linkedinAccounts)
        .where(eq(linkedinAccounts.unipileAccountId, unipileAccountId))
        .limit(1);
      return account
        ? {
          id: account.id,
          userId: account.userId,
          accountUserProviderId: null
        }
        : null;
    },
    async findChatByUnipileId(unipileChatId) {
      const [chat] = await db.select().from(linkedinChats).where(eq(linkedinChats.unipileChatId, unipileChatId)).limit(1);
      return chat
        ? {
          id: chat.id,
          userId: chat.userId,
          linkedinAccountId: chat.linkedinAccountId,
          personId: chat.personId,
          unipileChatId: chat.unipileChatId,
          isGroup: chat.isGroup ?? false,
          lastMessageAt: chat.lastMessageAt,
          lastMessageDirection: chat.lastMessageDirection
        }
        : null;
    },
    async upsertMessage(input) {
      const [message] = await db
        .insert(linkedinMessages)
        .values(input)
        .onConflictDoUpdate({
          target: linkedinMessages.unipileMessageId,
          set: {
            body: input.body,
            direction: input.direction,
            rawJson: input.rawJson
          }
        })
        .returning();
      return { personId: message?.personId ?? input.personId };
    },
    async findRelationship(input) {
      const [relationship] = await db
        .select()
        .from(linkedinRelationships)
        .where(and(eq(linkedinRelationships.userId, input.userId), eq(linkedinRelationships.personId, input.personId)))
        .limit(1);
      return relationship
        ? {
          id: relationship.id,
          userId: relationship.userId,
          linkedinAccountId: relationship.linkedinAccountId,
          personId: relationship.personId,
          relationshipStatus: relationship.relationshipStatus ?? "unknown",
          relationshipStage: relationship.relationshipStage ?? "needs_review",
          freshnessBucket: relationship.freshnessBucket ?? "no_activity",
          lastActivityAt: relationship.lastActivityAt,
          lastOutboundAt: relationship.lastOutboundAt,
          lastInboundAt: relationship.lastInboundAt,
          hasReplied: relationship.hasReplied ?? false,
          manualResponded: relationship.manualResponded ?? false,
          doNotContact: relationship.doNotContact ?? false,
          snoozedUntil: relationship.snoozedUntil
        }
        : null;
    },
    async listRelationshipMessages(input) {
      return db
        .select({
          direction: linkedinMessages.direction,
          body: linkedinMessages.body,
          sentAt: linkedinMessages.sentAt
        })
        .from(linkedinMessages)
        .where(and(eq(linkedinMessages.userId, input.userId), eq(linkedinMessages.personId, input.personId)));
    },
    async updateRelationshipState(input) {
      await db.update(linkedinRelationships).set({ ...input, updatedAt: new Date() }).where(eq(linkedinRelationships.id, input.relationshipId));
    },
    async markWebhookEventProcessed(webhookEventId) {
      await markWebhookProcessed(db, webhookEventId);
    }
  };
}

async function loadWebhookPayload(db: Database, webhookEventId: string): Promise<Record<string, unknown>> {
  const [event] = await db
    .select({ payload: unipileWebhookEvents.payload })
    .from(unipileWebhookEvents)
    .where(eq(unipileWebhookEvents.id, webhookEventId))
    .limit(1);
  if (!event || !event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    throw new Error("Webhook event not found");
  }
  return event.payload as Record<string, unknown>;
}

async function markWebhookProcessed(db: Database, webhookEventId: string) {
  await db
    .update(unipileWebhookEvents)
    .set({
      processingStatus: "processed",
      processedAt: new Date()
    })
    .where(eq(unipileWebhookEvents.id, webhookEventId));
}
