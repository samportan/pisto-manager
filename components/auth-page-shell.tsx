import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  eyebrow = "Pisto",
  children,
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute -right-1/4 bottom-0 h-[24rem] w-[24rem] rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/8" />
      </div>

      <header className="relative z-20 flex shrink-0 justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[min(100%,24rem)] flex-1 flex-col justify-center px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/75 p-8 shadow-xl shadow-zinc-950/5 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-black/40">
          <div className="mb-8 space-y-1.5 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          </div>

          {children}
        </div>

        <p className="mt-8 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          By continuing you agree to your own terms — this is a personal app.
        </p>
      </main>
    </div>
  );
}
