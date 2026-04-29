import { AuthCallback } from "@/components/auth/auth-callback";

type CallbackPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams;

  return <AuthCallback nextPath={params?.next ?? "/settings/linkedin"} />;
}
