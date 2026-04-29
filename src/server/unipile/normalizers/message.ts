import type { MessageDirection } from "@/server/db/schema";

export type RawUnipileMessage = Record<string, unknown>;

export type NormalizedUnipileMessage = {
  unipileMessageId: string;
  senderAttendeeProviderId: string | null;
  senderName: string | null;
  direction: MessageDirection;
  body: string | null;
  sentAt: Date;
  raw: RawUnipileMessage;
};

export function normalizeUnipileMessage(
  raw: RawUnipileMessage,
  accountUserProviderId?: string | null
): NormalizedUnipileMessage {
  const sender = objectValue(raw, "sender") ?? objectValue(raw, "from") ?? {};
  const senderAttendeeProviderId =
    stringValue(sender, "attendee_provider_id") ??
    stringValue(sender, "provider_id") ??
    stringValue(raw, "sender_attendee_provider_id") ??
    stringValue(raw, "sender_id");
  const sentAt = dateValue(raw, "sent_at") ?? dateValue(raw, "timestamp") ?? dateValue(raw, "date");

  if (!sentAt) {
    throw new Error("Unipile message is missing sent timestamp");
  }

  return {
    unipileMessageId: requireString(raw, "id", "message_id"),
    senderAttendeeProviderId,
    senderName: stringValue(sender, "name") ?? stringValue(sender, "full_name") ?? stringValue(raw, "sender_name"),
    direction: inferDirection(senderAttendeeProviderId, accountUserProviderId, raw),
    body: stringValue(raw, "text") ?? stringValue(raw, "body") ?? stringValue(raw, "message"),
    sentAt,
    raw
  };
}

function inferDirection(
  senderAttendeeProviderId: string | null,
  accountUserProviderId: string | null | undefined,
  raw: RawUnipileMessage
): MessageDirection {
  const explicitDirection = stringValue(raw, "direction");
  if (explicitDirection === "inbound" || explicitDirection === "outbound") return explicitDirection;

  if (!senderAttendeeProviderId || !accountUserProviderId) return "unknown";
  return senderAttendeeProviderId === accountUserProviderId ? "outbound" : "inbound";
}

function requireString(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = stringValue(input, key);
    if (value) return value;
  }
  throw new Error(`Unipile message is missing ${keys.join(" or ")}`);
}

function objectValue(input: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = input[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function dateValue(input: Record<string, unknown>, key: string): Date | null {
  const value = input[key];
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringValue(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
