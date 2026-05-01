import { desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  accountPeople,
  crmAccounts,
  linkedinRelationships,
  people,
  type FreshnessBucket,
  type RelationshipStage
} from "@/server/db/schema";

export type DashboardRelationshipRow = {
  relationshipId: string;
  personName: string;
  accountName: string | null;
  title: string | null;
  stage: RelationshipStage;
  freshnessBucket: FreshnessBucket;
  lastActivityAt: Date | null;
  updatedAt: Date | null;
};

export type DashboardResponse = {
  summary: {
    total: number;
    fresh: number;
    warm: number;
    cooling: number;
    stale: number;
    noActivity: number;
    dataAsOf: string | null;
  };
  rows: Array<{
    relationshipId: string;
    personName: string;
    accountName: string | null;
    title: string | null;
    stage: RelationshipStage;
    freshnessBucket: FreshnessBucket;
  }>;
};

export async function findDashboardRelationshipsByUserId(
  db: Database,
  userId: string
): Promise<DashboardRelationshipRow[]> {
  const rows = await db
    .select({
      relationshipId: linkedinRelationships.id,
      personName: people.fullName,
      accountName: crmAccounts.name,
      title: people.title,
      stage: linkedinRelationships.relationshipStage,
      freshnessBucket: linkedinRelationships.freshnessBucket,
      lastActivityAt: linkedinRelationships.lastActivityAt,
      updatedAt: linkedinRelationships.updatedAt
    })
    .from(linkedinRelationships)
    .innerJoin(people, eq(linkedinRelationships.personId, people.id))
    .leftJoin(accountPeople, eq(accountPeople.personId, people.id))
    .leftJoin(crmAccounts, eq(accountPeople.accountId, crmAccounts.id))
    .where(eq(linkedinRelationships.userId, userId))
    .orderBy(desc(linkedinRelationships.lastActivityAt), desc(linkedinRelationships.updatedAt));

  const uniqueRows = new Map<string, DashboardRelationshipRow>();
  for (const row of rows) {
    if (uniqueRows.has(row.relationshipId)) continue;
    uniqueRows.set(row.relationshipId, {
      relationshipId: row.relationshipId,
      personName: row.personName,
      accountName: row.accountName,
      title: row.title,
      stage: row.stage ?? "needs_review",
      freshnessBucket: row.freshnessBucket ?? "no_activity",
      lastActivityAt: row.lastActivityAt,
      updatedAt: row.updatedAt
    });
  }

  return [...uniqueRows.values()];
}

export function buildDashboardResponse(rows: DashboardRelationshipRow[]): DashboardResponse {
  const summary = {
    total: rows.length,
    fresh: 0,
    warm: 0,
    cooling: 0,
    stale: 0,
    noActivity: 0,
    dataAsOf: latestDashboardTimestamp(rows)
  };

  for (const row of rows) {
    if (row.freshnessBucket === "fresh") summary.fresh += 1;
    if (row.freshnessBucket === "warm") summary.warm += 1;
    if (row.freshnessBucket === "cooling") summary.cooling += 1;
    if (row.freshnessBucket === "stale") summary.stale += 1;
    if (row.freshnessBucket === "no_activity") summary.noActivity += 1;
  }

  return {
    summary,
    rows: rows.map((row) => ({
      relationshipId: row.relationshipId,
      personName: row.personName,
      accountName: row.accountName,
      title: row.title,
      stage: row.stage,
      freshnessBucket: row.freshnessBucket
    }))
  };
}

function latestDashboardTimestamp(rows: DashboardRelationshipRow[]): string | null {
  const latest = rows.reduce<Date | null>((current, row) => {
    const timestamps = [row.lastActivityAt, row.updatedAt].filter((value): value is Date => Boolean(value));
    const candidate = timestamps.reduce<Date | null>((rowLatest, value) => {
      if (!rowLatest || value > rowLatest) return value;
      return rowLatest;
    }, null);
    if (!candidate) return current;
    if (!current || candidate > current) return candidate;
    return current;
  }, null);

  return latest?.toISOString() ?? null;
}
