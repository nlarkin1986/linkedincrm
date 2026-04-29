import type { FreshnessBucket, RelationshipStage, RelationshipStatus } from "../schema";

export type RelationshipRecord = {
  id: string;
  userId: string;
  linkedinAccountId: string;
  personId: string;
  relationshipStatus: RelationshipStatus;
  relationshipStage: RelationshipStage;
  freshnessBucket: FreshnessBucket;
  lastActivityAt: Date | null;
  lastOutboundAt: Date | null;
  lastInboundAt: Date | null;
  hasReplied: boolean;
  manualResponded: boolean;
  doNotContact: boolean;
  snoozedUntil: Date | null;
};

export function markRelationshipResponded(
  relationship: RelationshipRecord,
  respondedAt: Date
): RelationshipRecord {
  return {
    ...relationship,
    manualResponded: true,
    hasReplied: true,
    relationshipStage: "replied",
    lastInboundAt: relationship.lastInboundAt ?? respondedAt,
    lastActivityAt: relationship.lastActivityAt && relationship.lastActivityAt > respondedAt
      ? relationship.lastActivityAt
      : respondedAt
  };
}
