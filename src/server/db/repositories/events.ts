export type RelationshipEventRecord = {
  id: string;
  relationshipId: string;
  eventType: string;
  eventAt: Date;
  source: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
};
