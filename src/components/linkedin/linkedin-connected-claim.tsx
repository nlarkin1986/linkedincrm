"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/client/supabase";

type ClaimState = "idle" | "claiming" | "claimed" | "skipped" | "error";

export function LinkedInConnectedClaim() {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [state, setState] = useState<ClaimState>("idle");
  const [message, setMessage] = useState("Historical sync will start once the account callback is processed.");

  useEffect(() => {
    let active = true;

    async function claimConnectedAccount() {
      const params = new URLSearchParams(window.location.search);
      const accountId = params.get("account_id");
      const claimToken = params.get("claim_token");
      if (!accountId || !claimToken) {
        setState("skipped");
        return;
      }
      if (supabase instanceof Error) {
        setState("error");
        setMessage(supabase.message);
        return;
      }

      setState("claiming");
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        if (!active) return;
        setState("error");
        setMessage(error?.message ?? "Sign in again to finish linking this LinkedIn account.");
        return;
      }

      const response = await fetch("/api/linkedin/claim-connected-account", {
        method: "POST",
        headers: {
          authorization: `Bearer ${data.session.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ accountId, claimToken })
      });
      const body = await response.json().catch(() => ({}));

      if (!active) return;
      if (!response.ok) {
        setState("error");
        setMessage(typeof body.error === "string" ? body.error : "Unable to link this LinkedIn account.");
        return;
      }

      setState("claimed");
      setMessage("LinkedIn account linked. Historical sync is queued.");
    }

    void claimConnectedAccount();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <p className={state === "error" ? "mt-2 text-sm text-red-600" : "mt-2 text-sm text-gray-500"} role="status">
      {state === "claiming" ? "Linking account..." : message}
    </p>
  );
}
