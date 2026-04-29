import type { MessageDirection } from "@/server/db/schema";
import {
  normalizeUnipileAttendee,
  selectOneToOneRelationshipAttendee,
  type NormalizedUnipileAttendee,
  type RawUnipileAttendee
} from "./attendee";

export type RawUnipileChat = Record<string, unknown>;

export type NormalizedUnipileChat = {
  unipileChatId: string;
  chatType: string | null;
  provider: "LINKEDIN";
  isGroup: boolean;
  unread: boolean | null;
  lastMessageAt: Date | null;
  lastMessageDirection: MessageDirection | null;
  attendees: NormalizedUnipileAttendee[];
  relationshipAttendee: NormalizedUnipileAttendee | null;
  raw: RawUnipileChat;
};

export function normalizeUnipileChat(
  raw: RawUnipileChat,
  accountUserProviderId?: string | null
): NormalizedUnipileChat {
  const attendees = arrayValue(raw, "attendees")
    .concat(arrayValue(raw, "participants"))
    .map((attendee) => normalizeUnipileAttendee(attendee));
  const chatType = stringValue(raw, "type") ?? stringValue(raw, "chat_type");
  const isGroup = booleanValue(raw, "is_group") ?? chatType?.toLowerCase().includes("group") ?? attendees.length > 2;
  const lastMessageDirection = normalizeDirection(
    stringValue(raw, "last_message_direction") ?? stringValue(raw, "last_direction")
  );

  return {
    unipileChatId: requireString(raw, "id", "chat_id"),
    chatType,
    provider: "LINKEDIN",
    isGroup,
    unread: booleanValue(raw, "unread"),
    lastMessageAt: dateValue(raw, "last_message_at") ?? dateValue(raw, "timestamp"),
    lastMessageDirection,
    attendees,
    relationshipAttendee: isGroup ? null : selectOneToOneRelationshipAttendee(attendees, accountUserProviderId),
    raw
  };
}

function normalizeDirection(value: string | null): MessageDirection | null {
  if (value === "inbound" || value === "outbound" || value === "unknown") return value;
  return null;
}

function requireString(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = stringValue(input, key);
    if (value) return value;
  }
  throw new Error(`Unipile chat is missing ${keys.join(" or ")}`);
}

function arrayValue(input: Record<string, unknown>, key: string): RawUnipileAttendee[] {
  const value = input[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function booleanValue(input: Record<string, unknown>, key: string): boolean | null {
  const value = input[key];
  return typeof value === "boolean" ? value : null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
