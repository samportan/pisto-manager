"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DocumentFormPageProps = {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  detailsTitle: string;
  detailsContent: React.ReactNode;
  linesTitle: string;
  linesContent: React.ReactNode;
  totalLabel: string;
  totalFormatted: string;
  cancelLabel: string;
  submitLabel: string;
  savingLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  error?: string | null;
  summaryTitle: string;
};

export function DocumentFormPage({
  backHref,
  backLabel,
  title,
  description,
  detailsTitle,
  detailsContent,
  linesTitle,
  linesContent,
  totalLabel,
  totalFormatted,
  cancelLabel,
  submitLabel,
  savingLabel,
  isSubmitting,
  onCancel,
  onSubmit,
  error,
  summaryTitle,
}: DocumentFormPageProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </header>

        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <form
          id="document-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-start xl:grid-cols-[1fr_19rem]"
        >
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{detailsTitle}</CardTitle>
              </CardHeader>
              <CardContent>{detailsContent}</CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle>{linesTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">{linesContent}</CardContent>
            </Card>

            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 lg:hidden">
              <span className="text-sm font-medium text-muted-foreground">{totalLabel}</span>
              <span className="text-xl font-bold tabular-nums">{totalFormatted}</span>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{summaryTitle}</CardTitle>
                  <CardDescription>{totalLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">{totalFormatted}</p>
                </CardContent>
              </Card>
              <div className="flex flex-col gap-2">
                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? savingLabel : submitLabel}
                </Button>
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={onCancel}>
                  {cancelLabel}
                </Button>
              </div>
            </div>
          </aside>
        </form>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
            <p className="truncate text-lg font-bold tabular-nums">{totalFormatted}</p>
          </div>
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="submit" form="document-form" disabled={isSubmitting}>
            {isSubmitting ? savingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
