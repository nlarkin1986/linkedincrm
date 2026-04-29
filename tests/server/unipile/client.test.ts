import { describe, expect, it, vi } from "vitest";
import { UnipileClient } from "@/server/unipile/client";
import { UnipileApiError, isRetryableUnipileError } from "@/server/unipile/errors";
import { collectUnipilePages } from "@/server/unipile/pagination";

describe("UnipileClient", () => {
  it("sends API key and JSON body when creating hosted auth links", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ object: "HostedAuthURL", url: "https://account.unipile.com/link" }));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    await client.createHostedAuthLink({
      apiUrl: "https://api1.unipile.com:123",
      expiresOn: "2026-04-29T22:00:00.000Z",
      name: "user_1"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api1.unipile.com:123/api/v1/hosted/accounts/link",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"providers":["LINKEDIN"]')
      })
    );
    const [, requestInit] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = requestInit.headers as Headers;
    expect(headers.get("X-API-KEY")).toBe("secret");
  });

  it("builds list chats query parameters", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [], cursor: null }));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    await client.listChats({ accountId: "acct_1", limit: 250, unread: true });

    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/chats?");
    expect(url).toContain("account_id=acct_1");
    expect(url).toContain("account_type=LINKEDIN");
    expect(url).toContain("limit=250");
    expect(url).toContain("unread=true");
  });

  it("maps retryable Unipile failures", async () => {
    const fetchImpl = vi.fn(async () => new Response("errors/provider_error", { status: 503 }));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    await expect(client.listMessages({ accountId: "acct_1" })).rejects.toThrow(UnipileApiError);

    try {
      await client.listMessages({ accountId: "acct_1" });
    } catch (error) {
      expect(isRetryableUnipileError(error)).toBe(true);
    }
  });

  it("collects cursor-paginated responses until cursor is null", async () => {
    const pages = await collectUnipilePages(async (cursor?: string) => {
      if (!cursor) return { items: [1, 2], cursor: "next" };
      return { items: [3], cursor: null };
    });

    expect(pages).toEqual([1, 2, 3]);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
