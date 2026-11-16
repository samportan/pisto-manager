"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useTranslations";
import { createClient } from "@/lib/client";
import { getSafeRedirectUrl } from "@/lib/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase-config";

type LoginFormProps = {
  nextPath?: string;
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  function handleForgotPassword() {
    setError(null);
    setInfo(t("auth.forgotDisabledNotice"));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setError(null);
    setInfo(null);

    const form = e.currentTarget;
    const email = (
      form.elements.namedItem("email") as HTMLInputElement
    ).value
      .trim()
      .toLowerCase();
    const password = (
      form.elements.namedItem("password") as HTMLInputElement
    ).value;

    if (!email || !password) {
      setError(t("auth.invalidCredentials"));
      return;
    }

    // Input bounds check to mitigate payload inflation & hashing DoS
    if (email.length > 254 || password.length > 128) {
      setError(t("auth.invalidCredentials"));
      return;
    }

    setPending(true);

    if (!isSupabaseConfigured()) {
      setPending(false);
      setError(t("auth.supabaseNotConfigured"));
      return;
    }

    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setPending(false);

      if (signError) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);

        if (nextFailed >= MAX_FAILED_ATTEMPTS) {
          setLockoutRemaining(LOCKOUT_SECONDS);
          setFailedAttempts(0);
          setError(
            t("auth.rateLimitLockout", { seconds: LOCKOUT_SECONDS })
          );
        } else {
          // Normalize error to prevent user enumeration
          setError(t("auth.invalidCredentials"));
        }
        return;
      }

      // Successful login: reset failed attempts and redirect safely
      setFailedAttempts(0);
      const safeTarget = getSafeRedirectUrl(nextPath, "/dashboard");
      router.push(safeTarget);
      router.refresh();
    } catch {
      setPending(false);
      setError(t("auth.invalidCredentials"));
    }
  }

  const isLocked = lockoutRemaining > 0;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground leading-relaxed"
          role="status"
        >
          {info}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-muted-foreground"
        >
          {t("auth.email")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={isLocked || pending}
          placeholder={t("auth.emailPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor="password"
            className="block text-xs font-semibold text-muted-foreground"
          >
            {t("auth.password")}
          </Label>
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline transition-colors"
            onClick={handleForgotPassword}
          >
            {t("auth.forgot")}
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          disabled={isLocked || pending}
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={pending || isLocked}
        className="mt-2 w-full"
      >
        {isLocked
          ? t("auth.rateLimitLockout", { seconds: lockoutRemaining })
          : pending
          ? t("auth.signingIn")
          : t("auth.signIn")}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {t("auth.requestAccess")}
        </Link>
      </p>
    </form>
  );
}
