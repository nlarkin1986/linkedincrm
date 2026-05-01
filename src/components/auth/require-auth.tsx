"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/client/supabase";

type RequireAuthProps = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (supabase instanceof Error) {
        window.location.replace(loginRedirectFor(window.location.pathname + window.location.search));
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session?.access_token) {
        window.location.replace(loginRedirectFor(window.location.pathname + window.location.search));
        return;
      }

      setAuthorized(true);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gladly-page flex items-center justify-center px-4">
        <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gladly-green flex items-center justify-center text-white font-bold">
              +
            </div>
            <span className="text-xl font-semibold text-gray-900">Gladly</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Checking sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Redirecting to sign in if needed.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function loginRedirectFor(nextPath: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}

function safeNextPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://app.example.com");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
