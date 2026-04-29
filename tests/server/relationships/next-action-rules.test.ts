import { describe, expect, it } from "vitest";
import { inferRuleBasedNextAction } from "@/server/relationships/next-action-rules";

describe("next action rules", () => {
  it("never suggests actions for do-not-contact relationships", () => {
    expect(inferRuleBasedNextAction({ stage: "do_not_contact", doNotContact: true })).toBe("none");
  });

  it("suggests follow-up for priority no-reply relationships past cooldown", () => {
    expect(
      inferRuleBasedNextAction({
        stage: "dm_sent_no_reply",
        doNotContact: false,
        lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
        now: new Date("2026-04-29T12:00:00Z")
      })
    ).toBe("follow_up");
  });

  it("does not follow up before cooldown", () => {
    expect(
      inferRuleBasedNextAction({
        stage: "dm_sent_no_reply",
        doNotContact: false,
        lastOutboundAt: new Date("2026-04-24T12:00:00Z"),
        now: new Date("2026-04-29T12:00:00Z")
      })
    ).toBe("wait");
  });
});
