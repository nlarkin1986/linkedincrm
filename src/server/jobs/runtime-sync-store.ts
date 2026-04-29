import { and, eq, desc } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  linkedinAccounts,
  linkedinChats,
  linkedinMessages,
  linkedinRelationships,
  people
} from "@/server/db/schema";
import type { LinkedInSyncStore } from "./linkedin-sync";
import type { PersonUpsertInput } from "@/server/relationships/person-upsert";

export function createRuntimeLinkedInSyncStore(db: Database): LinkedInSyncStore {
  return {
    async upsertPerson(input: PersonUpsertInput) {
      const existing = await findExistingPerson(db, input);
      const person = existing ?? (await db
        .insert(people)
        .values({
          fullName: input.fullName,
          title: input.title,
          companyName: input.companyName,
          location: input.location,
          linkedinUrl: input.linkedinUrl,
          linkedinPublicIdentifier: input.linkedinPublicIdentifier,
          linkedinProviderId: input.linkedinProviderId,
          profilePictureUrl: input.profilePictureUrl,
          source: input.source
        })
        .returning())[0];

      if (!person) throw new Error("Unable to upsert person");

      return {
        id: person.id,
        fullName: person.fullName,
        title: person.title,
        companyName: person.companyName,
        location: person.location,
        linkedinUrl: person.linkedinUrl,
        linkedinPublicIdentifier: person.linkedinPublicIdentifier,
        linkedinProviderId: person.linkedinProviderId,
        profilePictureUrl: person.profilePictureUrl,
        source: (person.source as "unipile_attendee" | "manual_review") ?? input.source
      };
    },
    async upsertRelationship(input) {
      const [relationship] = await db
        .insert(linkedinRelationships)
        .values({
          userId: input.userId,
          linkedinAccountId: input.linkedinAccountId,
          personId: input.personId,
          unipileAttendeeId: input.unipileAttendeeId,
          attendeeProviderId: input.attendeeProviderId,
          relationshipStatus: input.relationshipStatus
        })
        .onConflictDoUpdate({
          target: [linkedinRelationships.userId, linkedinRelationships.personId],
          set: {
            linkedinAccountId: input.linkedinAccountId,
            unipileAttendeeId: input.unipileAttendeeId,
            attendeeProviderId: input.attendeeProviderId,
            relationshipStatus: input.relationshipStatus,
            updatedAt: new Date()
          }
        })
        .returning();

      if (!relationship) throw new Error("Unable to upsert relationship");
      return relationshipRecord(relationship);
    },
    async upsertChat(input) {
      const [chat] = await db
        .insert(linkedinChats)
        .values(input)
        .onConflictDoUpdate({
          target: linkedinChats.unipileChatId,
          set: {
            personId: input.personId,
            unread: input.unread,
            lastMessageAt: input.lastMessageAt,
            lastMessageDirection: input.lastMessageDirection,
            rawJson: input.rawJson,
            updatedAt: new Date()
          }
        })
        .returning();

      if (!chat) throw new Error("Unable to upsert chat");
      return {
        id: chat.id,
        userId: chat.userId,
        linkedinAccountId: chat.linkedinAccountId,
        personId: chat.personId,
        unipileChatId: chat.unipileChatId,
        isGroup: chat.isGroup ?? false,
        lastMessageAt: chat.lastMessageAt,
        lastMessageDirection: chat.lastMessageDirection
      };
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
            personId: input.personId,
            rawJson: input.rawJson
          }
        })
        .returning();

      if (!message) throw new Error("Unable to upsert message");
      return {
        id: message.id,
        userId: message.userId,
        linkedinAccountId: message.linkedinAccountId,
        linkedinChatId: message.linkedinChatId,
        personId: message.personId,
        unipileMessageId: message.unipileMessageId,
        direction: message.direction,
        body: message.body,
        sentAt: message.sentAt
      };
    },
    async findChatByUnipileId(input) {
      const [chat] = await db
        .select()
        .from(linkedinChats)
        .where(eq(linkedinChats.unipileChatId, input.unipileChatId))
        .limit(1);

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
    async findRelationship(input) {
      const [relationship] = await db
        .select()
        .from(linkedinRelationships)
        .where(and(eq(linkedinRelationships.userId, input.userId), eq(linkedinRelationships.personId, input.personId)))
        .limit(1);

      return relationship ? relationshipRecord(relationship) : null;
    },
    async listRelationshipMessages(input) {
      return db
        .select({
          direction: linkedinMessages.direction,
          body: linkedinMessages.body,
          sentAt: linkedinMessages.sentAt
        })
        .from(linkedinMessages)
        .where(and(eq(linkedinMessages.userId, input.userId), eq(linkedinMessages.personId, input.personId)))
        .orderBy(desc(linkedinMessages.sentAt));
    },
    async updateRelationshipState(input) {
      await db
        .update(linkedinRelationships)
        .set({
          relationshipStage: input.relationshipStage,
          freshnessBucket: input.freshnessBucket,
          lastActivityAt: input.lastActivityAt,
          lastOutboundAt: input.lastOutboundAt,
          lastInboundAt: input.lastInboundAt,
          lastMessagePreview: input.lastMessagePreview,
          hasReplied: input.hasReplied,
          updatedAt: new Date()
        })
        .where(eq(linkedinRelationships.id, input.relationshipId));
    },
    async markAccountSynced(input) {
      await db
        .update(linkedinAccounts)
        .set({
          lastFullSyncAt: input.syncType === "full" ? input.syncedAt : undefined,
          lastPartialSyncAt: input.syncType === "partial" ? input.syncedAt : undefined,
          updatedAt: new Date()
        })
        .where(eq(linkedinAccounts.id, input.linkedinAccountId));
    },
    async recordSyncError() {}
  };
}

async function findExistingPerson(db: Database, input: PersonUpsertInput) {
  if (input.linkedinProviderId) {
    const [person] = await db.select().from(people).where(eq(people.linkedinProviderId, input.linkedinProviderId)).limit(1);
    if (person) return person;
  }
  if (input.linkedinPublicIdentifier) {
    const [person] = await db.select().from(people).where(eq(people.linkedinPublicIdentifier, input.linkedinPublicIdentifier)).limit(1);
    if (person) return person;
  }
  const [person] = await db.select().from(people).where(eq(people.fullName, input.fullName)).limit(1);
  return person ?? null;
}

function relationshipRecord(relationship: typeof linkedinRelationships.$inferSelect) {
  return {
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
  };
}
