import type { FreshnessBucket, RelationshipStage, RelationshipStatus } from "@/server/db/schema";

export type StageInput = {
  doNotContact: boolean;
  snoozedUntil?: Date | null;
  relationshipStatus: RelationshipStatus;
  lastOutboundAt?: Date | null;
  lastInboundAt?: Date | null;
  messageCount: number;
  freshnessBucket: FreshnessBucket;
  now?: Date;
};

export function computeRelationshipStage(input: StageInput): RelationshipStage {
  const now = input.now ?? new Date();

  if (input.doNotContact) return "do_not_contact";
  if (input.snoozedUntil && input.snoozedUntil > now) return "snoozed";

  if (input.relationshipStatus === "not_connected") return "not_connected";
  if (input.relationshipStatus === "invited") return "invite_sent";

  if (input.relationshipStatus === "connected" && input.messageCount === 0) {
    return "connected_no_dm";
  }

  if (input.lastInboundAt && input.lastOutboundAt && input.lastInboundAt > input.lastOutboundAt) {
    if (input.messageCount >= 4) return "engaged";
    return "replied";
  }

  if (input.lastOutboundAt && (!input.lastInboundAt || input.lastOutboundAt > input.lastInboundAt)) {
    return "dm_sent_no_reply";
  }
  if (input.freshnessBucket === "stale") return "stale";

  return "needs_review";
}

export function hasReplied(lastInboundAt?: Date | null, lastOutboundAt?: Date | null): boolean {
  return Boolean(lastInboundAt && (!lastOutboundAt || lastInboundAt > lastOutboundAt));
}
