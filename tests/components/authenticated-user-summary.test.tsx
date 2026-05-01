import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthenticatedUserSummaryView } from "@/components/auth/authenticated-user-summary";
import { loginRedirectFor } from "@/components/auth/require-auth";

describe("AuthenticatedUserSummaryView", () => {
  it("renders the signed-in user's name and initials in the menu", () => {
    render(
      <AuthenticatedUserSummaryView
        summary={{
          status: "ready",
          data: {
            user: {
              displayName: "Nate Larkin",
              email: "nate@example.com",
              initials: "NL"
            },
            linkedin: {
              state: "connected",
              accounts: [{ status: "OK", reconnectRequired: false }]
            }
          }
        }}
      />
    );

    expect(screen.getByRole("button", { name: /Nate Larkin/i })).toBeInTheDocument();
    expect(screen.getByText("NL")).toBeInTheDocument();
  });

  it("renders connected LinkedIn state without demo user text", () => {
    render(
      <AuthenticatedUserSummaryView
        variant="linkedin-settings"
        summary={{
          status: "ready",
          data: {
            user: {
              displayName: "Nate Larkin",
              email: "nate@example.com",
              initials: "NL"
            },
            linkedin: {
              state: "connected",
              accounts: [{ status: "OK", reconnectRequired: false }]
            }
          }
        }}
      />
    );

    expect(screen.getByText("Nate Larkin")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText(/Daniel|Danny|Torres|DT/)).not.toBeInTheDocument();
  });

  it("renders an email fallback and not-connected state", () => {
    render(
      <AuthenticatedUserSummaryView
        variant="linkedin-settings"
        summary={{
          status: "ready",
          data: {
            user: {
              displayName: "nate@example.com",
              email: "nate@example.com",
              initials: "NA"
            },
            linkedin: {
              state: "not_connected",
              accounts: []
            }
          }
        }}
      />
    );

    expect(screen.getByText("nate@example.com")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("renders sign-in required state when no session exists", () => {
    render(<AuthenticatedUserSummaryView variant="linkedin-settings" summary={{ status: "unauthenticated" }} />);

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });

  it("renders an explicit profile error in menu mode", () => {
    render(<AuthenticatedUserSummaryView summary={{ status: "error", message: "Unable to load current user." }} />);

    expect(screen.getByRole("button", { name: /Profile error/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Loading/i })).not.toBeInTheDocument();
  });

  it("builds safe login redirects for protected routes", () => {
    expect(loginRedirectFor("/settings/linkedin")).toBe("/login?next=%2Fsettings%2Flinkedin");
    expect(loginRedirectFor("https://evil.example.com")).toBe("/login?next=%2F");
    expect(loginRedirectFor("//evil.example.com")).toBe("/login?next=%2F");
  });
});
