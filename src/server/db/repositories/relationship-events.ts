import type { RelationshipStage } from "../schema";

export function buildStageChangedEvent(input: {
  relationshipId: string;
  from: RelationshipStage;
  to: RelationshipStage;
  reason: string;
  source: string;
}) {
  return {
    relationshipId: input.relationshipId,
    eventType: "stage_changed",
    source: input.source,
    metadata: {
      from: input.from,
      to: input.to,
      reason: input.reason
    }
  };
}
