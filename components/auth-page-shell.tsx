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
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="relative z-20 flex shrink-0 justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[min(100%,24rem)] flex-1 flex-col justify-center px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          By continuing you agree to your own terms — this is a personal app.
        </p>
      </main>
    </div>
  );
}
