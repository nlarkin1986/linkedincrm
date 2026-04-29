import { Badge } from "@/components/gladly/badge";

export default function LinkedInErrorPage() {
  return (
    <main className="min-h-screen bg-gladly-page flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center">
        <Badge variant="danger">Connection failed</Badge>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">LinkedIn was not connected</h1>
        <p className="mt-2 text-sm text-gray-500">Return to settings and generate a new hosted auth link.</p>
      </section>
    </main>
  );
}
