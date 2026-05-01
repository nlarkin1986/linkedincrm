import { AuthenticatedUserSummary } from "@/components/auth/authenticated-user-summary";
import { RequireAuth } from "@/components/auth/require-auth";
import { LinkedInConnectButton } from "@/components/linkedin/linkedin-connect-button";

export default function LinkedInSettingsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-white px-10 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Connect or reconnect the LinkedIn account used for relationship sync.</p>
        </div>
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <AuthenticatedUserSummary variant="linkedin-settings" />
          <LinkedInConnectButton />
        </section>
      </main>
    </RequireAuth>
  );
}
