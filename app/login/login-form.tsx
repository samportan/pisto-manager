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
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-muted-foreground"
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
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor="password"
            className="block text-xs font-semibold text-muted-foreground"
          >
            Password
          </Label>
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline transition-colors"
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
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
      >
        <SiApple className="size-4 shrink-0" aria-hidden />
        Continue with Apple
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
