import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthPageShell } from "@/components/auth-page-shell";
import { defaultLocale, isValidLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Pisto account",
};

export default async function SignupPage() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = getMessages(locale);

  return (
    <AuthPageShell
      title={messages.auth.signupTitle}
      subtitle={messages.auth.signupSubtitle}
      footer={messages.auth.termsNotice}
      brandLine={messages.auth.brandLine}
      brandNote={messages.auth.brandNote}
    >
      <SignupForm />
    </AuthPageShell>
  );
}
