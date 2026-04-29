import { describe, expect, it } from "vitest";
import { recomputeRelationshipState } from "@/server/relationships/recompute";
import { buildStageChangedEvent } from "@/server/db/repositories/relationship-events";

describe("relationship recompute", () => {
  const now = new Date("2026-04-29T12:00:00Z");

  it("updates reply state from real message history", () => {
    const state = recomputeRelationshipState({
      relationshipStatus: "connected",
      doNotContact: false,
      previousStage: "dm_sent_no_reply",
      messages: [
        {
          direction: "outbound",
          body: "Saw your team is thinking about guest experience.",
          sentAt: new Date("2026-04-20T12:00:00Z")
        },
        {
          direction: "inbound",
          body: "Happy to chat.",
          sentAt: new Date("2026-04-24T12:00:00Z")
        }
      ],
      now
    });

    expect(state).toMatchObject({
      relationshipStage: "replied",
      freshnessBucket: "warm",
      hasReplied: true,
      stageChanged: true,
      lastMessagePreview: "Happy to chat."
    });
  });

  it("uses connection date when no messages exist", () => {
    const state = recomputeRelationshipState({
      relationshipStatus: "connected",
      doNotContact: false,
      connectionDate: new Date("2026-04-28T12:00:00Z"),
      messages: [],
      now
    });

    expect(state.relationshipStage).toBe("connected_no_dm");
    expect(state.freshnessBucket).toBe("fresh");
  });

  it("builds stage changed event metadata exactly once per detected change", () => {
    expect(
      buildStageChangedEvent({
        relationshipId: "rel_1",
        from: "dm_sent_no_reply",
        to: "replied",
        reason: "Inbound LinkedIn message received after last outbound",
        source: "webhook"
      })
    ).toEqual({
      relationshipId: "rel_1",
      eventType: "stage_changed",
      source: "webhook",
      metadata: {
        from: "dm_sent_no_reply",
        to: "replied",
        reason: "Inbound LinkedIn message received after last outbound"
      }
    });
  });
});
