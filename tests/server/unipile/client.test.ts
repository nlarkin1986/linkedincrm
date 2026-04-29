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

  it("uses the configured Unipile DSN when listing accounts", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [], cursor: null }));
    const client = new UnipileClient({ dsn: "api17.unipile.com:14746", apiKey: "secret", fetchImpl });

    await client.listAccounts({ limit: 25, cursor: "next_cursor" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api17.unipile.com:14746/api/v1/accounts?limit=25&cursor=next_cursor",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("accepts a full base URL as a DSN", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [], cursor: null }));
    const client = new UnipileClient({ dsn: "https://api17.unipile.com:14746/", apiKey: "secret", fetchImpl });

    await client.listWebhooks();

    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api17.unipile.com:14746/api/v1/webhooks");
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

  it("sends multipart form data for messaging endpoints", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "message_1" }));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    await client.sendMessageInChat("chat_1", {
      text: "Hello",
      attachments: [new Blob(["file"], { type: "text/plain" })]
    });

    const [url, requestInit] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api1.unipile.com:123/api/v1/chats/chat_1/messages");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeInstanceOf(FormData);
    const headers = requestInit.headers as Headers;
    expect(headers.get("content-type")).toBeNull();
  });

  it("supports binary attachment downloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    const attachment = await client.getMessageAttachment("message/1", "attachment 1");

    expect(attachment.byteLength).toBe(3);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api1.unipile.com:123/api/v1/messages/message%2F1/attachments/attachment%201");
  });

  it("wires LinkedIn-specific API helpers", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ object: "LinkedinSearch" }));
    const client = new UnipileClient({ dsn: "api1.unipile.com:123", apiKey: "secret", fetchImpl });

    await client.searchLinkedIn({ account_id: "acct_1", api: "classic", keywords: "Gladly" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api1.unipile.com:123/api/v1/linkedin/search",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"keywords":"Gladly"')
      })
    );
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
