import type { ReactNode } from "react";
import { PistoLogo } from "@/components/pisto-logo";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  footer?: string;
  eyebrow?: string;
  brandLine?: string;
  brandNote?: string;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  footer,
  eyebrow = "Pisto",
  brandLine,
  brandNote,
  children,
}: AuthPageShellProps) {
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,34rem)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.24_0.05_258)] px-12 py-10 text-[oklch(0.96_0.01_250)] lg:flex">
        <PistoLogo
          size={36}
          showLabel
          tone="panel"
          labelClassName="text-[oklch(0.96_0.01_250)]"
        />
        <div className="max-w-md">
          {brandLine ? (
            <p className="font-display text-[3.25rem] leading-[1.05] font-medium tracking-[-0.03em]">
              {brandLine}
            </p>
          ) : null}
          {brandNote ? (
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[oklch(0.96_0.01_250)]/75">
              {brandNote}
            </p>
          ) : null}
        </div>
        <p className="text-xs tracking-wide text-[oklch(0.96_0.01_250)]/60">
          Pisto
        </p>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-20 size-72 rounded-full bg-accent/30"
        />
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex shrink-0 justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <ThemeToggle />
        </header>

        <main className="mx-auto flex w-full max-w-[min(100%,26rem)] flex-1 flex-col justify-center px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <div className="mb-8 space-y-3 lg:hidden">
            <PistoLogo size={40} showLabel />
          </div>
          <div className="space-y-2">
            {eyebrow !== "Pisto" ? (
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[2rem] leading-none">{title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
          {footer ? (
            <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{footer}</p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
