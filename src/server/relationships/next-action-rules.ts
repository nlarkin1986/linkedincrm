import type { RelationshipStage } from "@/server/db/schema";

export type RuleBasedNextAction =
  | "send_invite"
  | "send_dm"
  | "follow_up"
  | "open_linkedin"
  | "wait"
  | "none";

export function inferRuleBasedNextAction(input: {
  stage: RelationshipStage;
  doNotContact: boolean;
  snoozedUntil?: Date | null;
  lastOutboundAt?: Date | null;
  now?: Date;
}): RuleBasedNextAction {
  const now = input.now ?? new Date();
  if (input.doNotContact) return "none";
  if (input.snoozedUntil && input.snoozedUntil > now) return "none";

  if (input.stage === "not_connected") return "send_invite";
  if (input.stage === "connected_no_dm") return "send_dm";
  if (input.stage === "replied") return "open_linkedin";
  if (input.stage === "dm_sent_no_reply" || input.stage === "stale") {
    if (!input.lastOutboundAt) return "follow_up";
    const daysSinceOutbound = Math.floor((now.getTime() - input.lastOutboundAt.getTime()) / 86_400_000);
    return daysSinceOutbound >= 7 ? "follow_up" : "wait";
  }

  return "wait";
}
