import { describe, expect, it, vi } from "vitest";
import type { LinkedInChatRecord } from "@/server/db/repositories/chats";
import { importChatMessages, type LinkedInSyncAccount } from "@/server/jobs/linkedin-sync";

describe("importChatMessages", () => {
  it("imports every cursor-paginated message and determines direction from the account sender", async () => {
    const upsertMessage = vi.fn(async (input) => ({
      id: input.unipileMessageId,
      userId: input.userId,
      linkedinAccountId: input.linkedinAccountId,
      linkedinChatId: input.linkedinChatId,
      personId: input.personId,
      unipileMessageId: input.unipileMessageId,
      direction: input.direction,
      body: input.body,
      sentAt: input.sentAt
    }));
    const unipile = {
      listMessagesForChat: vi.fn(async (_chatId: string, cursor?: string) => {
        if (!cursor) {
          return {
            items: [
              {
                id: "msg_1",
                text: "First outbound",
                sent_at: "2026-04-20T12:00:00Z",
                sender: { attendee_provider_id: "rep_provider", name: "Daniel Torres" }
              }
            ],
            cursor: "next"
          };
        }

        return {
          items: [
            {
              id: "msg_2",
              text: "Thanks, happy to chat.",
              sent_at: "2026-04-24T12:00:00Z",
              sender: { attendee_provider_id: "buyer_provider", name: "Jane Buyer" }
            }
          ],
          cursor: null
        };
      })
    };

    const result = await importChatMessages({
      account: account(),
      chat: chat(),
      unipileChatId: "chat_1",
      personId: "person_1",
      source: "initial_sync",
      unipile,
      store: { upsertMessage }
    });

    expect(result).toEqual({ importedCount: 2, affectedPersonIds: ["person_1"] });
    expect(upsertMessage).toHaveBeenCalledTimes(2);
    expect(upsertMessage.mock.calls.map(([message]) => message.direction)).toEqual(["outbound", "inbound"]);
    expect(unipile.listMessagesForChat).toHaveBeenLastCalledWith("chat_1", "next");
  });
});

function account(): LinkedInSyncAccount {
  return {
    id: "linkedin_account_1",
    userId: "user_1",
    unipileAccountId: "unipile_account_1",
    status: "OK",
    reconnectRequired: false,
    accountUserProviderId: "rep_provider"
  };
}

function chat(): LinkedInChatRecord {
  return {
    id: "chat_row_1",
    userId: "user_1",
    linkedinAccountId: "linkedin_account_1",
    personId: "person_1",
    unipileChatId: "chat_1",
    isGroup: false,
    lastMessageAt: null,
    lastMessageDirection: null
  };
}
