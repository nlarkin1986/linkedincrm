import type { FreshnessBucket, MessageDirection, RelationshipStage, RelationshipStatus } from "@/server/db/schema";
import { getFreshnessBucket } from "./freshness";
import { computeRelationshipStage, hasReplied } from "./stage-engine";

export type RelationshipMessage = {
  direction: MessageDirection;
  body: string | null;
  sentAt: Date;
};

export type RecomputeInput = {
  relationshipStatus: RelationshipStatus;
  doNotContact: boolean;
  snoozedUntil?: Date | null;
  connectionDate?: Date | null;
  previousStage?: RelationshipStage | null;
  messages: RelationshipMessage[];
  now?: Date;
};

export type RecomputedRelationshipState = {
  relationshipStage: RelationshipStage;
  freshnessBucket: FreshnessBucket;
  lastActivityAt: Date | null;
  lastOutboundAt: Date | null;
  lastInboundAt: Date | null;
  lastMessagePreview: string | null;
  hasReplied: boolean;
  stageChanged: boolean;
};

export function recomputeRelationshipState(input: RecomputeInput): RecomputedRelationshipState {
  const sorted = [...input.messages].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  const lastOutboundAt = lastDateForDirection(sorted, "outbound");
  const lastInboundAt = lastDateForDirection(sorted, "inbound");
  const latestMessage = sorted.at(-1) ?? null;
  const lastActivityAt = maxDate([input.connectionDate ?? null, lastOutboundAt, lastInboundAt]);
  const freshnessBucket = getFreshnessBucket(lastActivityAt, input.now);
  const relationshipStage = computeRelationshipStage({
    doNotContact: input.doNotContact,
    snoozedUntil: input.snoozedUntil,
    relationshipStatus: input.relationshipStatus,
    lastOutboundAt,
    lastInboundAt,
    messageCount: sorted.length,
    freshnessBucket,
    now: input.now
  });

  return {
    relationshipStage,
    freshnessBucket,
    lastActivityAt,
    lastOutboundAt,
    lastInboundAt,
    lastMessagePreview: latestMessage?.body?.slice(0, 240) ?? null,
    hasReplied: hasReplied(lastInboundAt, lastOutboundAt),
    stageChanged: Boolean(input.previousStage && input.previousStage !== relationshipStage)
  };
}

function lastDateForDirection(messages: RelationshipMessage[], direction: "inbound" | "outbound"): Date | null {
  return [...messages].reverse().find((message) => message.direction === direction)?.sentAt ?? null;
}

function maxDate(dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    if (!latest || date > latest) return date;
    return latest;
  }, null);
}
