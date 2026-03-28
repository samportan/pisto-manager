import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in to manage your money."
    >
      <LoginForm nextPath={next} />
    </AuthPageShell>
  );
}
