import { Check } from "lucide-react";
import { Badge } from "@/components/gladly/badge";
import { LinkedInConnectedClaim } from "@/components/linkedin/linkedin-connected-claim";

export default function LinkedInConnectedPage() {
  return (
    <main className="min-h-screen bg-gladly-page flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-11 w-11 rounded-lg bg-gladly-park-light text-gladly-green flex items-center justify-center">
          <Check className="h-6 w-6" />
        </div>
        <Badge variant="active">Connected</Badge>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">LinkedIn account connected</h1>
        <LinkedInConnectedClaim />
      </section>
    </main>
  );
}
