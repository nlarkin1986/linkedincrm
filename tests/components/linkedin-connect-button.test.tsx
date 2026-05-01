import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserSupabaseClient } from "@/client/supabase";
import { LinkedInConnectButton } from "@/components/linkedin/linkedin-connect-button";

vi.mock("@/client/supabase", () => ({
  createBrowserSupabaseClient: vi.fn()
}));

const createBrowserSupabaseClientMock = vi.mocked(createBrowserSupabaseClient);

describe("LinkedInConnectButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createBrowserSupabaseClientMock.mockReset();
    global.fetch = vi.fn(async () => Response.json({ url: "https://account.unipile.com/connect" }));
    createBrowserSupabaseClientMock.mockReturnValue(supabaseClient("token_1") as never);
  });

  it("posts a connect request for signed-in users", async () => {
    const onHostedAuthUrl = vi.fn();
    render(<LinkedInConnectButton onHostedAuthUrl={onHostedAuthUrl} />);

    fireEvent.click(await screen.findByRole("button", { name: "Connect LinkedIn" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/linkedin/connect-url",
      expect.objectContaining({
        method: "POST",
        body: "{}"
      })
    ));
    expect(onHostedAuthUrl).toHaveBeenCalledWith("https://account.unipile.com/connect");
  });

  it("posts the local account id for reconnect", async () => {
    const onHostedAuthUrl = vi.fn();
    render(
      <LinkedInConnectButton
        mode="reconnect"
        onHostedAuthUrl={onHostedAuthUrl}
        reconnectAccountId="linkedin_account_1"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Reconnect LinkedIn" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/linkedin/connect-url",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reconnectAccountId: "linkedin_account_1" })
      })
    ));
    expect(onHostedAuthUrl).toHaveBeenCalledWith("https://account.unipile.com/connect");
  });

  it("renders friendly text when the connect-url request fails", async () => {
    global.fetch = vi.fn(async () => Response.json({ error: "raw provider failure" }, { status: 500 }));

    render(<LinkedInConnectButton />);

    fireEvent.click(await screen.findByRole("button", { name: "Connect LinkedIn" }));

    expect(await screen.findByText("Unable to start LinkedIn connection. Try again.")).toBeInTheDocument();
    expect(screen.queryByText("raw provider failure")).not.toBeInTheDocument();
  });

  it("does not call the API for reconnect without a local account id", async () => {
    render(<LinkedInConnectButton mode="reconnect" />);

    fireEvent.click(await screen.findByRole("button", { name: "Reconnect LinkedIn" }));

    expect(await screen.findByText("Unable to start LinkedIn reconnection. Open LinkedIn settings and try again.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

function supabaseClient(accessToken: string) {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: accessToken } },
        error: null
      })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }))
    }
  };
}
