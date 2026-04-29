import { describe, expect, it } from "vitest";
import { computeRelationshipStage, hasReplied } from "@/server/relationships/stage-engine";

describe("relationship stage engine", () => {
  const now = new Date("2026-04-29T12:00:00Z");

  it("prioritizes do-not-contact", () => {
    expect(
      computeRelationshipStage({
        doNotContact: true,
        relationshipStatus: "connected",
        messageCount: 3,
        freshnessBucket: "fresh",
        now
      })
    ).toBe("do_not_contact");
  });

  it("prioritizes active snooze after do-not-contact", () => {
    expect(
      computeRelationshipStage({
        doNotContact: false,
        snoozedUntil: new Date("2026-05-01T12:00:00Z"),
        relationshipStatus: "connected",
        messageCount: 3,
        freshnessBucket: "fresh",
        now
      })
    ).toBe("snoozed");
  });

  it("maps connected with no messages to connected_no_dm", () => {
    expect(
      computeRelationshipStage({
        doNotContact: false,
        relationshipStatus: "connected",
        messageCount: 0,
        freshnessBucket: "no_activity",
        now
      })
    ).toBe("connected_no_dm");
  });

  it("maps outbound with no inbound to dm_sent_no_reply", () => {
    expect(
      computeRelationshipStage({
        doNotContact: false,
        relationshipStatus: "connected",
        messageCount: 1,
        lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
        freshnessBucket: "stale",
        now
      })
    ).toBe("dm_sent_no_reply");
  });

  it("maps newer outbound after an older inbound to dm_sent_no_reply", () => {
    expect(
      computeRelationshipStage({
        doNotContact: false,
        relationshipStatus: "connected",
        messageCount: 2,
        lastInboundAt: new Date("2026-04-19T12:00:00Z"),
        lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
        freshnessBucket: "warm",
        now
      })
    ).toBe("dm_sent_no_reply");
  });

  it("detects reply only when inbound is after outbound", () => {
    const inbound = new Date("2026-04-24T12:00:00Z");
    const outbound = new Date("2026-04-20T12:00:00Z");

    expect(hasReplied(inbound, outbound)).toBe(true);
    expect(hasReplied(outbound, inbound)).toBe(false);
  });

  it("marks active conversations as engaged after enough messages", () => {
    expect(
      computeRelationshipStage({
        doNotContact: false,
        relationshipStatus: "connected",
        messageCount: 4,
        lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
        lastInboundAt: new Date("2026-04-24T12:00:00Z"),
        freshnessBucket: "warm",
        now
      })
    ).toBe("engaged");
  });
});
