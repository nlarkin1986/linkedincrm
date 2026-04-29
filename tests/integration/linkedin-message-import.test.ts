import { describe, expect, it } from "vitest";
import { normalizeUnipileChat } from "@/server/unipile/normalizers/chat";
import { normalizeUnipileMessage } from "@/server/unipile/normalizers/message";
import { recomputeRelationshipState } from "@/server/relationships/recompute";

describe("LinkedIn message import integration", () => {
  it("turns a one-to-one Unipile chat into a replied relationship state", () => {
    const chat = normalizeUnipileChat(
      {
        id: "chat_1",
        attendees: [
          { attendee_provider_id: "rep_provider", name: "Daniel Torres" },
          { attendee_provider_id: "buyer_provider", profile: { full_name: "Jane Buyer" } }
        ]
      },
      "rep_provider"
    );
    const messages = [
      normalizeUnipileMessage(
        {
          id: "msg_1",
          text: "Thought this would be useful.",
          sent_at: "2026-04-17T12:00:00Z",
          sender: { attendee_provider_id: "rep_provider" }
        },
        "rep_provider"
      ),
      normalizeUnipileMessage(
        {
          id: "msg_2",
          text: "Thanks, I replied.",
          sent_at: "2026-04-24T12:00:00Z",
          sender: { attendee_provider_id: "buyer_provider" }
        },
        "rep_provider"
      )
    ];

    const state = recomputeRelationshipState({
      relationshipStatus: "connected",
      doNotContact: false,
      messages,
      now: new Date("2026-04-29T12:00:00Z")
    });

    expect(chat.relationshipAttendee?.providerId).toBe("buyer_provider");
    expect(state).toMatchObject({
      relationshipStage: "replied",
      freshnessBucket: "warm",
      hasReplied: true
    });
  });
});
