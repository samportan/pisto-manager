import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth-page-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Pisto account",
};

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Create an account"
      subtitle="Start tracking your money in one place."
    >
      <SignupForm />
    </AuthPageShell>
  );
}
