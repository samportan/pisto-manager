"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

const inputClassName =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-sm outline-none ring-zinc-400/30 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:bg-zinc-950 dark:focus:ring-zinc-600/40";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement)
      .value;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setPending(true);

    if (!isSupabaseConfigured()) {
      setPending(false);
      router.push("/dashboard");
      return;
    }

    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setPending(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setInfo(
      "Check your inbox to confirm your email, then you can sign in."
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          {info}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="confirm"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          Confirm password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          className={inputClassName}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
