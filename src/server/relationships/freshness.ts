import type { FreshnessBucket } from "@/server/db/schema";

const dayMs = 24 * 60 * 60 * 1000;

export function getFreshnessBucket(lastActivityAt: Date | null, now = new Date()): FreshnessBucket {
  if (!lastActivityAt) return "no_activity";

  const days = Math.floor(
    (startOfUtcDay(now).getTime() - startOfUtcDay(lastActivityAt).getTime()) / dayMs
  );

  if (days <= 3) return "fresh";
  if (days <= 7) return "warm";
  if (days <= 14) return "cooling";
  return "stale";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
