import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gladly-page flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gladly-green flex items-center justify-center text-white font-bold">
            +
          </div>
          <span className="text-xl font-semibold text-gray-900">Gladly</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-2 text-sm text-gray-500">
          Access the LinkedIn Connections Tracker with your Gladly account.
        </p>
        <LoginForm nextPath={params?.next ?? "/settings/linkedin"} />
      </section>
    </main>
  );
}
