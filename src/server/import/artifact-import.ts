import type { FreshnessBucket, RelationshipStage, RelationshipStatus } from "@/server/db/schema";

const validBuckets = ["fresh", "warm", "cooling", "stale", "no_activity"] as const;
const validStatuses = ["unknown", "not_connected", "invited", "connected"] as const;

export type ArtifactRelationshipRow = {
  name: string;
  account?: string | null;
  title?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  lastActivityAt?: string | Date | null;
  freshnessBucket?: FreshnessBucket | null;
  relationshipStatus?: RelationshipStatus | null;
  relationshipStage?: RelationshipStage | null;
  hasReplied?: boolean;
  manualResponded?: boolean;
};

export type PreparedArtifactRelationship = {
  person: {
    fullName: string;
    title: string | null;
    location: string | null;
    linkedinUrl: string | null;
  };
  accountName: string | null;
  relationship: {
    relationshipStatus: RelationshipStatus;
    relationshipStage: RelationshipStage;
    freshnessBucket: FreshnessBucket;
    lastActivityAt: Date | null;
    hasReplied: boolean;
    manualResponded: boolean;
  };
};

export function prepareArtifactImport(rows: ArtifactRelationshipRow[]): PreparedArtifactRelationship[] {
  return rows.map((row, index) => {
    if (!row.name?.trim()) {
      throw new Error(`Artifact row ${index + 1} is missing a name`);
    }

    const freshnessBucket = row.freshnessBucket ?? "no_activity";
    if (!validBuckets.includes(freshnessBucket)) {
      throw new Error(`Artifact row ${index + 1} has invalid freshness bucket: ${freshnessBucket}`);
    }

    const relationshipStatus = row.relationshipStatus ?? "connected";
    if (!validStatuses.includes(relationshipStatus)) {
      throw new Error(`Artifact row ${index + 1} has invalid relationship status: ${relationshipStatus}`);
    }

    return {
      person: {
        fullName: row.name.trim(),
        title: row.title?.trim() || null,
        location: row.location?.trim() || null,
        linkedinUrl: row.linkedinUrl?.trim() || null
      },
      accountName: row.account?.trim() || null,
      relationship: {
        relationshipStatus,
        relationshipStage: row.relationshipStage ?? inferArtifactStage(row),
        freshnessBucket,
        lastActivityAt: parseOptionalDate(row.lastActivityAt),
        hasReplied: row.hasReplied ?? row.manualResponded ?? false,
        manualResponded: row.manualResponded ?? false
      }
    };
  });
}

function parseOptionalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid artifact date: ${value}`);
  }
  return parsed;
}

function inferArtifactStage(row: ArtifactRelationshipRow): RelationshipStage {
  if (row.manualResponded || row.hasReplied) return "replied";
  if (row.relationshipStatus === "not_connected") return "not_connected";
  if (row.relationshipStatus === "invited") return "invite_sent";
  if (!row.lastActivityAt) return "connected_no_dm";
  if (row.freshnessBucket === "stale") return "stale";
  return "needs_review";
}
