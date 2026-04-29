"use client";

import { useMemo, useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { Button } from "@/components/gladly/button";
import { Input } from "@/components/gladly/input";
import { createBrowserSupabaseClient } from "@/client/supabase";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath = "/settings/linkedin" }: LoginFormProps) {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    if (supabase instanceof Error) {
      setStatus("error");
      setMessage(supabase.message);
      return;
    }

    const redirectTo = `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    }).catch((error: unknown) => ({
      error: error instanceof Error ? error : new Error("Unable to reach Supabase auth.")
    }));

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-gray-700" htmlFor="email">
        Email
      </label>
      <Input
        autoComplete="email"
        icon={<Mail className="h-4 w-4" />}
        id="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@gladly.com"
        required
        type="email"
        value={email}
      />
      <Button className="w-full" disabled={status === "sending"} type="submit">
        <LogIn className="h-4 w-4" />
        {status === "sending" ? "Sending link..." : "Continue with email"}
      </Button>
      {message ? (
        <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-gray-600"} role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
