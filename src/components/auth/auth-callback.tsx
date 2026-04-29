"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/client/supabase";

type AuthCallbackProps = {
  nextPath: string;
};

export function AuthCallback({ nextPath }: AuthCallbackProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setMessage(error.message);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        if (active) setMessage(error?.message ?? "No sign-in session was found.");
        return;
      }

      window.location.replace(safeRelativeRedirect(nextPath));
    }

    void finishSignIn();

    return () => {
      active = false;
    };
  }, [nextPath, supabase]);

  return (
    <main className="min-h-screen bg-gladly-page flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gladly-green flex items-center justify-center text-white font-bold">
            +
          </div>
          <span className="text-xl font-semibold text-gray-900">Gladly</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Signing in</h1>
        <p className="mt-2 text-sm text-gray-500" role="status">
          {message}
        </p>
      </section>
    </main>
  );
}

function safeRelativeRedirect(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const parsed = new URL(value, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
