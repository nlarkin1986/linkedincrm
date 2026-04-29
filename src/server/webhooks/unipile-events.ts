import type { MessageDirection } from "@/server/db/schema";
import type { RelationshipRecord } from "@/server/db/repositories/relationships";
import type { LinkedInChatRecord } from "@/server/db/repositories/chats";
import { recomputeRelationshipState, type RelationshipMessage } from "@/server/relationships/recompute";
import { buildReplyNotification, type ReplyNotification } from "@/server/notifications/reply-notifications";
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
  return {
    eventType,
    unipileAccountId: stringValue(payload, "account_id") ?? stringValue(payload, "accountId"),
    externalEventId: stringValue(payload, "id") ?? stringValue(payload, "event_id"),
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
  const unipileAccountId = stringValue(input.payload, "account_id") ?? stringValue(input.payload, "accountId");
  if (!unipileAccountId) throw new Error("Messaging webhook missing account_id");

  const account = await input.store.findLinkedInAccountByUnipileId(unipileAccountId);
  if (!account) throw new Error(`LinkedIn account not found for Unipile account ${unipileAccountId}`);

  const rawMessage = extractMessage(input.payload);
  const accountUserProviderId = account.accountUserProviderId ?? stringValue(objectValue(input.payload, "account_info") ?? {}, "user_id");
  const message = normalizeUnipileMessage(rawMessage, accountUserProviderId);
  const unipileChatId = stringValue(input.payload, "chat_id") ?? stringValue(rawMessage, "chat_id");
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
  return {
    unipileAccountId: requireString(payload, "account_id", "accountId"),
    userProviderId: stringValue(payload, "user_provider_id"),
    userPublicIdentifier: stringValue(payload, "user_public_identifier"),
    userProfileUrl: stringValue(payload, "user_profile_url"),
    userFullName: stringValue(payload, "user_full_name") ?? "Unknown LinkedIn person"
  };
}

export function parseAccountStatusWebhook(payload: Record<string, unknown>) {
  const status = requireString(payload, "status");
  return {
    unipileAccountId: requireString(payload, "account_id", "accountId"),
    status,
    reconnectRequired: status !== "OK",
    statusMessage: stringValue(payload, "message") ?? stringValue(payload, "status_message")
  };
}

function extractMessage(payload: Record<string, unknown>): RawUnipileMessage {
  return objectValue(payload, "message") ?? payload;
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
