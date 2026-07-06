"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useTranslations";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value?.trim();
    if (!email) {
      setError(t("auth.forgotNeedEmail"));
      return;
    }
    if (!isSupabaseConfigured()) {
      setError(t("auth.supabaseNotConfigured"));
      return;
    }
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo(t("auth.forgotSent"));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    setPending(true);

    if (!isSupabaseConfigured()) {
      setPending(false);
      if (process.env.NODE_ENV === "production") {
        setError(t("auth.supabaseNotConfigured"));
        return;
      }
      const safeNext =
        nextPath &&
        nextPath.startsWith("/") &&
        !nextPath.startsWith("//")
          ? nextPath
          : null;
      router.push(safeNext ?? "/dashboard");
      return;
    }

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    const safeNext =
      nextPath &&
      nextPath.startsWith("/") &&
      !nextPath.startsWith("//")
        ? nextPath
        : null;
    router.push(safeNext ?? "/dashboard");
    router.refresh();
  }

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
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
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
            onClick={() => void handleForgotPassword()}
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
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full"
      >
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {t("auth.createOne")}
        </Link>
      </p>
    </form>
  );
}
