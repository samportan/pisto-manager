import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthPageShell } from "@/components/auth-page-shell";
import { defaultLocale, isValidLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
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
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = getMessages(locale);

  return (
    <AuthPageShell
      title={messages.auth.loginTitle}
      subtitle={messages.auth.loginSubtitle}
      footer={messages.auth.termsNotice}
    >
      <LoginForm nextPath={next} />
    </AuthPageShell>
  );
}
