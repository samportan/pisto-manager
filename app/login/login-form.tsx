"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiApple } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

const inputClassName =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-sm outline-none ring-zinc-400/30 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:bg-zinc-950 dark:focus:ring-zinc-600/40";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    setPending(true);

    if (!isSupabaseConfigured()) {
      setPending(false);
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
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
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
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor="password"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            Password
          </Label>
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Forgot?
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputClassName}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <hr className="my-4 border-zinc-200 dark:border-zinc-800" />

      <Button
        type="button"
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        <SiApple className="size-5 shrink-0" aria-hidden />
        Continue with Apple
      </Button>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
