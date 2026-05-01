import type { MessageDirection } from "@/server/db/schema";
import type { RelationshipRecord } from "@/server/db/repositories/relationships";
import type { LinkedInChatRecord } from "@/server/db/repositories/chats";
import { recomputeRelationshipState, type RelationshipMessage } from "@/server/relationships/recompute";
import { buildReplyNotification, type ReplyNotification } from "@/server/notifications/reply-notifications";
import { extractUnipileAccountMetadata } from "@/server/unipile/account-metadata";
import { normalizeUnipileMessage, type RawUnipileMessage } from "@/server/unipile/normalizers/message";

export type StoredWebhookEvent = {
  eventType: string;
  unipileAccountId: string | null;
  externalEventId: string | null;
  payload: Record<string, unknown>;
  processingStatus: "pending" | "processed" | "failed";
};

export type MessagingWebhookProcessingStore = {
  upsertWebhookEvent(input: StoredWebhookEvent): Promise<{ id: string }>;
  findLinkedInAccountByUnipileId(unipileAccountId: string): Promise<{ id: string; userId: string; accountUserProviderId?: string | null } | null>;
  updateLinkedInAccountMetadata?(input: {
    unipileAccountId: string;
    accountUserProviderId?: string | null;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
  }): Promise<void>;
  findChatByUnipileId(unipileChatId: string): Promise<LinkedInChatRecord | null>;
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
    source: "webhook";
    rawJson: Record<string, unknown>;
  }): Promise<{ personId: string | null }>;
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
  enqueueReplyNotification?(input: ReplyNotification): Promise<void>;
  markWebhookEventProcessed?(webhookEventId: string): Promise<void>;
};

export function buildStoredWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>
): StoredWebhookEvent {
  const eventPayload = webhookEventPayload(payload);

  return {
    eventType,
    unipileAccountId:
      stringValue(payload, "account_id") ??
      stringValue(payload, "accountId") ??
      stringValue(eventPayload, "account_id") ??
      stringValue(eventPayload, "accountId"),
    externalEventId:
      stringValue(payload, "id") ??
      stringValue(payload, "event_id") ??
      stringValue(eventPayload, "id") ??
      stringValue(eventPayload, "event_id"),
    payload,
    processingStatus: "pending"
  };
}

export async function processUnipileMessagingWebhook(input: {
  payload: Record<string, unknown>;
  webhookEventId?: string;
  store: MessagingWebhookProcessingStore;
  now?: Date;
}) {
  const webhookEvent = input.webhookEventId
    ? { id: input.webhookEventId }
    : await input.store.upsertWebhookEvent(buildStoredWebhookEvent("messaging", input.payload));
  const eventPayload = webhookEventPayload(input.payload);
  const unipileAccountId =
    stringValue(input.payload, "account_id") ??
    stringValue(input.payload, "accountId") ??
    stringValue(eventPayload, "account_id") ??
    stringValue(eventPayload, "accountId");
  if (!unipileAccountId) throw new Error("Messaging webhook missing account_id");

  const account = await input.store.findLinkedInAccountByUnipileId(unipileAccountId);
  if (!account) throw new Error(`LinkedIn account not found for Unipile account ${unipileAccountId}`);

  const rawMessage = extractMessage(input.payload);
  const metadata = extractUnipileAccountMetadata(input.payload);
  await input.store.updateLinkedInAccountMetadata?.({
    unipileAccountId,
    ...metadata
  });
  const accountUserProviderId = account.accountUserProviderId ?? metadata.accountUserProviderId;
  const message = normalizeUnipileMessage(rawMessage, accountUserProviderId);
  const unipileChatId =
    stringValue(input.payload, "chat_id") ??
    stringValue(eventPayload, "chat_id") ??
    stringValue(rawMessage, "chat_id");
  if (!unipileChatId) throw new Error("Messaging webhook missing chat_id");

  const chat = await input.store.findChatByUnipileId(unipileChatId);
  if (!chat) throw new Error(`LinkedIn chat not found for Unipile chat ${unipileChatId}`);

  const persistedMessage = await input.store.upsertMessage({
    userId: account.userId,
    linkedinAccountId: account.id,
    linkedinChatId: chat.id,
    personId: chat.personId,
    unipileMessageId: message.unipileMessageId,
    senderAttendeeProviderId: message.senderAttendeeProviderId,
    senderName: message.senderName,
    direction: message.direction,
    body: message.body,
    sentAt: message.sentAt,
    source: "webhook",
    rawJson: message.raw
  });

  const personId = persistedMessage.personId ?? chat.personId;
  const relationship = personId ? await input.store.findRelationship({ userId: account.userId, personId }) : null;
  let replyNotification: ReplyNotification | null = null;

  if (relationship && personId) {
    const messages = await input.store.listRelationshipMessages({ userId: account.userId, personId });
    const state = recomputeRelationshipState({
      relationshipStatus: relationship.relationshipStatus,
      doNotContact: relationship.doNotContact,
      snoozedUntil: relationship.snoozedUntil,
      previousStage: relationship.relationshipStage,
      messages,
      now: input.now
    });
    await input.store.updateRelationshipState({ relationshipId: relationship.id, ...state });

    if (message.direction === "inbound" && state.hasReplied) {
      replyNotification = buildReplyNotification({
        userId: account.userId,
        relationshipId: relationship.id,
        personId,
        messagePreview: message.body?.slice(0, 240) ?? null,
        receivedAt: message.sentAt
      });
      await input.store.enqueueReplyNotification?.(replyNotification);
    }
  }

  await input.store.markWebhookEventProcessed?.(webhookEvent.id);

  return {
    webhookEventId: webhookEvent.id,
    direction: message.direction,
    relationshipUpdated: Boolean(relationship),
    replyNotification
  };
}

export function parseNewRelationWebhook(payload: Record<string, unknown>) {
  const relationPayload = webhookEventPayload(payload);

  return {
    unipileAccountId:
      stringValue(payload, "account_id") ??
      stringValue(payload, "accountId") ??
      requireString(relationPayload, "account_id", "accountId"),
    userProviderId: stringValue(relationPayload, "user_provider_id") ?? stringValue(relationPayload, "provider_id"),
    userPublicIdentifier: stringValue(relationPayload, "user_public_identifier") ?? stringValue(relationPayload, "public_identifier"),
    userProfileUrl: stringValue(relationPayload, "user_profile_url") ?? stringValue(relationPayload, "profile_url"),
    userFullName:
      stringValue(relationPayload, "user_full_name") ??
      stringValue(relationPayload, "full_name") ??
      "Unknown LinkedIn person"
  };
}

export function parseAccountStatusWebhook(payload: Record<string, unknown>) {
  const statusPayload = webhookEventPayload(payload);
  const status = requireAccountStatus(payload, statusPayload);

  return {
    unipileAccountId:
      stringValue(payload, "account_id") ??
      stringValue(payload, "accountId") ??
      requireString(statusPayload, "account_id", "accountId"),
    status,
    reconnectRequired: reconnectRequiredForStatus(status),
    statusMessage: accountStatusMessage(payload, statusPayload, status)
  };
}

function extractMessage(payload: Record<string, unknown>): RawUnipileMessage {
  const eventPayload = webhookEventPayload(payload);
  return objectValue(eventPayload, "message") ?? eventPayload;
}

function webhookEventPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return (
    objectValue(payload, "AccountStatus") ??
    objectValue(payload, "account_status") ??
    objectValue(payload, "accountStatus") ??
    objectValue(payload, "NewRelation") ??
    objectValue(payload, "new_relation") ??
    objectValue(payload, "newRelation") ??
    objectValue(payload, "User") ??
    objectValue(payload, "user") ??
    objectValue(payload, "event") ??
    objectValue(payload, "data") ??
    payload
  );
}

function requireAccountStatus(payload: Record<string, unknown>, statusPayload: Record<string, unknown>) {
  return (
    stringValue(statusPayload, "status") ??
    stringValue(payload, "status") ??
    stringValue(statusPayload, "message") ??
    stringValue(payload, "message") ??
    requireString(statusPayload, "status")
  );
}

function accountStatusMessage(
  payload: Record<string, unknown>,
  statusPayload: Record<string, unknown>,
  status: string
) {
  const explicitMessage =
    stringValue(statusPayload, "status_message") ??
    stringValue(statusPayload, "statusMessage") ??
    stringValue(statusPayload, "reason") ??
    stringValue(statusPayload, "error") ??
    stringValue(payload, "status_message") ??
    stringValue(payload, "statusMessage") ??
    stringValue(payload, "reason") ??
    stringValue(payload, "error");
  if (explicitMessage) return explicitMessage;

  const topLevelMessage = stringValue(payload, "message");
  if (topLevelMessage && topLevelMessage !== status) return topLevelMessage;
  const nestedMessage = stringValue(statusPayload, "message");
  return nestedMessage && nestedMessage !== status ? nestedMessage : undefined;
}

function reconnectRequiredForStatus(status: string) {
  return !new Set(["OK", "SYNC_SUCCESS", "CREATION_SUCCESS", "RECONNECTED"]).has(status);
}

function requireString(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = stringValue(input, key);
    if (value) return value;
  }
  throw new Error(`Webhook payload missing ${keys.join(" or ")}`);
}

function objectValue(input: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = input[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
