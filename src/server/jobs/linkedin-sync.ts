import type { MessageDirection } from "@/server/db/schema";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";
import type { LinkedInChatRecord } from "@/server/db/repositories/chats";
import type { LinkedInMessageRecord } from "@/server/db/repositories/messages";
import type { RelationshipRecord } from "@/server/db/repositories/relationships";
import { recomputeRelationshipState, type RelationshipMessage } from "@/server/relationships/recompute";
import { buildPersonUpsertFromAttendee, type PersonRecord, type PersonUpsertInput } from "@/server/relationships/person-upsert";
import { collectUnipilePages } from "@/server/unipile/pagination";
import { normalizeUnipileChat, type RawUnipileChat } from "@/server/unipile/normalizers/chat";
import { normalizeUnipileMessage, type RawUnipileMessage } from "@/server/unipile/normalizers/message";

export type SyncableUnipileClient = {
  resyncAccount(params: {
    accountId: string;
    partial?: boolean;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
    afterEpochMs?: number;
    beforeEpochMs?: number;
    chunkSize?: number;
  }): Promise<unknown>;
  listChats(params: {
    accountId: string;
    accountType?: "LINKEDIN";
    after?: string;
    before?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: RawUnipileChat[]; cursor?: string | null }>;
  listMessagesForChat(chatId: string, cursor?: string): Promise<{ items: RawUnipileMessage[]; cursor?: string | null }>;
  listMessages(params: {
    accountId: string;
    after?: string;
    before?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: RawUnipileMessage[]; cursor?: string | null }>;
};

export type LinkedInSyncAccount = LinkedInAccountRecord & {
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
  accountUserProviderId?: string | null;
};

export type LinkedInSyncStore = {
  upsertPerson(input: PersonUpsertInput): Promise<PersonRecord>;
  upsertRelationship(input: {
    userId: string;
    linkedinAccountId: string;
    personId: string;
    unipileAttendeeId: string | null;
    attendeeProviderId: string | null;
    relationshipStatus: "connected" | "unknown";
  }): Promise<RelationshipRecord>;
  upsertChat(input: {
    userId: string;
    linkedinAccountId: string;
    personId: string | null;
    unipileChatId: string;
    chatType: string | null;
    provider: "LINKEDIN";
    isGroup: boolean;
    unread: boolean | null;
    lastMessageAt: Date | null;
    lastMessageDirection: MessageDirection | null;
    rawJson: Record<string, unknown>;
  }): Promise<LinkedInChatRecord>;
  upsertMessage(input: {
    userId: string;
    linkedinAccountId: string;
    linkedinChatId: string;
    personId: string | null;
    unipileMessageId: string;
    senderAttendeeProviderId: string | null;
    senderName: string | null;
    direction: MessageDirection;
    body: string | null;
    sentAt: Date;
    source: "initial_sync" | "resync";
    rawJson: Record<string, unknown>;
  }): Promise<LinkedInMessageRecord>;
  findChatByUnipileId(input: { unipileChatId: string }): Promise<LinkedInChatRecord | null>;
  findRelationship(input: { userId: string; personId: string }): Promise<RelationshipRecord | null>;
  listRelationshipMessages(input: { userId: string; personId: string }): Promise<RelationshipMessage[]>;
  updateRelationshipState(input: {
    relationshipId: string;
    relationshipStage: RelationshipRecord["relationshipStage"];
    freshnessBucket: RelationshipRecord["freshnessBucket"];
    lastActivityAt: Date | null;
    lastOutboundAt: Date | null;
    lastInboundAt: Date | null;
    lastMessagePreview: string | null;
    hasReplied: boolean;
  }): Promise<void>;
  markAccountSynced(input: { linkedinAccountId: string; syncType: "full" | "partial"; syncedAt: Date }): Promise<void>;
  recordSyncError?(input: { linkedinAccountId: string; unipileChatId?: string; error: string }): Promise<void>;
};

export type ImportChatMessagesInput = {
  account: LinkedInSyncAccount;
  chat: LinkedInChatRecord;
  unipileChatId: string;
  personId: string | null;
  source: "initial_sync" | "resync";
  unipile: Pick<SyncableUnipileClient, "listMessagesForChat">;
  store: Pick<LinkedInSyncStore, "upsertMessage">;
};

export type ImportChatMessagesResult = {
  importedCount: number;
  affectedPersonIds: string[];
};

export async function importChatMessages(input: ImportChatMessagesInput): Promise<ImportChatMessagesResult> {
  const messages = await collectUnipilePages<RawUnipileMessage>((cursor) =>
    input.unipile.listMessagesForChat(input.unipileChatId, cursor)
  );
  const affectedPersonIds = new Set<string>();

  for (const rawMessage of messages) {
    const normalized = normalizeUnipileMessage(rawMessage, input.account.accountUserProviderId);
    const message = await input.store.upsertMessage({
      userId: input.account.userId,
      linkedinAccountId: input.account.id,
      linkedinChatId: input.chat.id,
      personId: input.personId,
      unipileMessageId: normalized.unipileMessageId,
      senderAttendeeProviderId: normalized.senderAttendeeProviderId,
      senderName: normalized.senderName,
      direction: normalized.direction,
      body: normalized.body,
      sentAt: normalized.sentAt,
      source: input.source,
      rawJson: normalized.raw
    });
    if (message.personId) affectedPersonIds.add(message.personId);
  }

  return {
    importedCount: messages.length,
    affectedPersonIds: [...affectedPersonIds]
  };
}

export async function syncLinkedInAccountInitial(input: {
  account: LinkedInSyncAccount;
  unipile: SyncableUnipileClient;
  store: LinkedInSyncStore;
  now?: Date;
}) {
  await input.unipile.resyncAccount({
    accountId: input.account.unipileAccountId,
    partial: false,
    linkedinProduct: input.account.linkedinProduct ?? undefined
  });

  const chats = await collectUnipilePages<RawUnipileChat>((cursor) =>
    input.unipile.listChats({
      accountId: input.account.unipileAccountId,
      accountType: "LINKEDIN",
      limit: 250,
      cursor
    })
  );

  const affectedPersonIds = new Set<string>();
  const affectedRelationshipByPersonId = new Map<string, RelationshipRecord>();
  let importedMessageCount = 0;

  for (const rawChat of chats) {
    try {
      const normalizedChat = normalizeUnipileChat(rawChat, input.account.accountUserProviderId);
      const person = normalizedChat.relationshipAttendee
        ? await input.store.upsertPerson(buildPersonUpsertFromAttendee(normalizedChat.relationshipAttendee))
        : null;
      const relationship = person
        ? await input.store.upsertRelationship({
          userId: input.account.userId,
          linkedinAccountId: input.account.id,
          personId: person.id,
          unipileAttendeeId: normalizedChat.relationshipAttendee?.unipileAttendeeId ?? null,
          attendeeProviderId: normalizedChat.relationshipAttendee?.providerId ?? null,
          relationshipStatus: "connected"
        })
        : null;
      const chat = await input.store.upsertChat({
        userId: input.account.userId,
        linkedinAccountId: input.account.id,
        personId: person?.id ?? null,
        unipileChatId: normalizedChat.unipileChatId,
        chatType: normalizedChat.chatType,
        provider: normalizedChat.provider,
        isGroup: normalizedChat.isGroup,
        unread: normalizedChat.unread,
        lastMessageAt: normalizedChat.lastMessageAt,
        lastMessageDirection: normalizedChat.lastMessageDirection,
        rawJson: normalizedChat.raw
      });
      const messageResult = await importChatMessages({
        account: input.account,
        chat,
        unipileChatId: normalizedChat.unipileChatId,
        personId: person?.id ?? null,
        source: "initial_sync",
        unipile: input.unipile,
        store: input.store
      });

      importedMessageCount += messageResult.importedCount;
      messageResult.affectedPersonIds.forEach((personId) => affectedPersonIds.add(personId));
      if (person) affectedPersonIds.add(person.id);
      if (person && relationship) affectedRelationshipByPersonId.set(person.id, relationship);
    } catch (error) {
      await input.store.recordSyncError?.({
        linkedinAccountId: input.account.id,
        error: error instanceof Error ? error.message : "Unknown sync error"
      });
    }
  }

  await recomputeAffectedRelationships({
    account: input.account,
    store: input.store,
    affectedRelationships: [...affectedPersonIds]
      .map((personId) => affectedRelationshipByPersonId.get(personId))
      .filter((relationship): relationship is RelationshipRecord => Boolean(relationship)),
    now: input.now
  });
  await input.store.markAccountSynced({
    linkedinAccountId: input.account.id,
    syncType: "full",
    syncedAt: input.now ?? new Date()
  });

  return {
    importedChatCount: chats.length,
    importedMessageCount,
    affectedRelationshipCount: affectedRelationshipByPersonId.size
  };
}

export async function syncLinkedInAccountPartial(input: {
  account: LinkedInSyncAccount;
  unipile: SyncableUnipileClient;
  store: Pick<
    LinkedInSyncStore,
    | "findChatByUnipileId"
    | "findRelationship"
    | "listRelationshipMessages"
    | "markAccountSynced"
    | "updateRelationshipState"
    | "upsertMessage"
  >;
  after: Date;
  before?: Date;
  now?: Date;
}) {
  await input.unipile.resyncAccount({
    accountId: input.account.unipileAccountId,
    partial: true,
    linkedinProduct: input.account.linkedinProduct ?? undefined,
    afterEpochMs: input.after.getTime(),
    beforeEpochMs: input.before?.getTime()
  });

  const messages = await collectUnipilePages<RawUnipileMessage>((cursor) =>
    input.unipile.listMessages({
      accountId: input.account.unipileAccountId,
      after: input.after.toISOString(),
      before: input.before?.toISOString(),
      limit: 250,
      cursor
    })
  );
  const affectedRelationships = new Map<string, RelationshipRecord>();

  for (const rawMessage of messages) {
    const unipileChatId = stringValue(rawMessage, "chat_id");
    if (!unipileChatId) continue;

    const chat = await input.store.findChatByUnipileId({ unipileChatId });
    if (!chat) continue;

    const normalized = normalizeUnipileMessage(rawMessage, input.account.accountUserProviderId);
    const message = await input.store.upsertMessage({
      userId: input.account.userId,
      linkedinAccountId: input.account.id,
      linkedinChatId: chat.id,
      personId: chat.personId,
      unipileMessageId: normalized.unipileMessageId,
      senderAttendeeProviderId: normalized.senderAttendeeProviderId,
      senderName: normalized.senderName,
      direction: normalized.direction,
      body: normalized.body,
      sentAt: normalized.sentAt,
      source: "resync",
      rawJson: normalized.raw
    });

    if (message.personId) {
      const relationship = await input.store.findRelationship({
        userId: input.account.userId,
        personId: message.personId
      });
      if (relationship) affectedRelationships.set(relationship.id, relationship);
    }
  }

  await recomputeAffectedRelationships({
    account: input.account,
    store: input.store,
    affectedRelationships: [...affectedRelationships.values()],
    now: input.now
  });

  await input.store.markAccountSynced({
    linkedinAccountId: input.account.id,
    syncType: "partial",
    syncedAt: input.now ?? new Date()
  });

  return {
    fetchedMessageCount: messages.length,
    importedMessageCount: messages.length,
    affectedRelationshipCount: affectedRelationships.size
  };
}

async function recomputeAffectedRelationships(input: {
  account: LinkedInSyncAccount;
  store: Pick<LinkedInSyncStore, "listRelationshipMessages" | "updateRelationshipState">;
  affectedRelationships: RelationshipRecord[];
  now?: Date;
}) {
  for (const relationship of input.affectedRelationships) {
    const messages = await input.store.listRelationshipMessages({
      userId: input.account.userId,
      personId: relationship.personId
    });
    const state = recomputeRelationshipState({
      relationshipStatus: relationship.relationshipStatus,
      doNotContact: relationship.doNotContact,
      snoozedUntil: relationship.snoozedUntil,
      previousStage: relationship.relationshipStage,
      messages,
      now: input.now
    });
    await input.store.updateRelationshipState({
      relationshipId: relationship.id,
      ...state
    });
  }
}

function stringValue(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
