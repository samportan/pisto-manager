"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Copy, Mail, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/hooks/useTranslations";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "samportan@protonmail.com";

export function SignupForm() {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const mailtoSubject = encodeURIComponent("Solicitud de acceso a Pisto");
  const mailtoBody = encodeURIComponent(
    `Hola Samuel,\n\nSolicito una cuenta para acceder a Pisto con los siguientes datos:\n\n- Nombre completo:\n- Nombre del negocio:\n- Correo para la cuenta:\n\n¡Gracias!`
  );
  const mailtoUrl = `mailto:${ADMIN_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement("textarea");
      textArea.value = ADMIN_EMAIL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {t("auth.requestAccessBadge")}
            </span>
            <h2 className="text-sm font-semibold text-foreground">
              {t("auth.requestAccessCardTitle")}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("auth.requestAccessCardDesc")}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background/80 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("auth.email")}
          </p>
          <p className="font-mono text-sm font-semibold text-foreground select-all break-all">
            {ADMIN_EMAIL}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 w-full">
          <a
            href={mailtoUrl}
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full h-10 gap-2 justify-center text-center font-medium"
            )}
          >
            <Mail className="size-4 shrink-0" />
            <span>{t("auth.requestAccessSendEmail")}</span>
          </a>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2 justify-center font-medium"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-500 shrink-0" />
                <span>{t("auth.requestAccessEmailCopied")}</span>
              </>
            ) : (
              <>
                <Copy className="size-4 shrink-0" />
                <span>{t("auth.requestAccessCopyEmail")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">
          {t("auth.requestAccessInstructionsTitle")}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("auth.requestAccessInstructions")}
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t("auth.requestAccessBackToLogin")}
        </Link>
      </p>
    </div>
  );
}
