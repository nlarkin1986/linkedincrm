import { describe, expect, it, vi } from "vitest";
import { queueLinkedInFullResync, queueLinkedInPartialSync } from "@/server/linkedin/sync-actions";

describe("LinkedIn sync actions", () => {
  it("rejects sync for accounts owned by another user", async () => {
    await expect(
      queueLinkedInPartialSync({
        user: { id: "user_1", email: "one@example.com" },
        accountId: "linkedin_account_1",
        body: {},
        store: {
          async findLinkedInAccountById() {
            return account("user_2");
          }
        },
        queue: { send: vi.fn() }
      })
    ).rejects.toThrow(/cannot access/i);
  });

  it("enqueues partial and full sync only after ownership is verified", async () => {
    const send = vi.fn(async () => {});
    const store = {
      async findLinkedInAccountById() {
        return account("user_1");
      }
    };

    await queueLinkedInPartialSync({
      user: { id: "user_1", email: "one@example.com" },
      accountId: "linkedin_account_1",
      body: { after: "2026-04-20T00:00:00Z" },
      store,
      queue: { send }
    });
    await queueLinkedInFullResync({
      user: { id: "user_1", email: "one@example.com" },
      accountId: "linkedin_account_1",
      store,
      queue: { send }
    });

    expect((send.mock.calls as unknown as Array<[{ name: string }]>).map(([event]) => event.name)).toEqual([
      "linkedin/account.sync_partial",
      "linkedin/account.sync_initial"
    ]);
  });
});

function account(userId: string) {
  return {
    id: "linkedin_account_1",
    userId,
    unipileAccountId: "unipile_account_1",
    status: "OK",
    reconnectRequired: false
  };
}
