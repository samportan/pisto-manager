import { cn } from "@/lib/utils";

type PistoLogoProps = {
  size?: number;
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
  tone?: "default" | "inverse" | "panel";
};

export function PistoLogo({
  size = 32,
  showLabel = false,
  className,
  labelClassName,
  tone = "default",
}: PistoLogoProps) {
  const onInverse = tone === "inverse";
  const onPanel = tone === "panel";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={showLabel ? undefined : true}
        role={showLabel ? "img" : undefined}
        aria-label={showLabel ? "Pisto" : undefined}
      >
        <rect
          width="32"
          height="32"
          rx="7"
          className={
            onPanel
              ? "fill-[oklch(0.96_0.01_250)]"
              : onInverse
                ? "fill-primary-foreground"
                : "fill-primary"
          }
        />
        <path
          d="M11 9v14"
          className={
            onPanel
              ? "stroke-[oklch(0.24_0.05_258)]"
              : onInverse
                ? "stroke-primary"
                : "stroke-primary-foreground"
          }
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M11 9h5.2c3.3 0 5.3 2 5.3 5.1c0 3.1-2 5.1-5.3 5.1H11"
          className={
            onPanel
              ? "stroke-[oklch(0.24_0.05_258)]"
              : onInverse
                ? "stroke-primary"
                : "stroke-primary-foreground"
          }
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="3.2" className="fill-accent" />
      </svg>
      {showLabel ? (
        <span
          className={cn(
            "font-display text-lg font-medium tracking-tight text-foreground",
            labelClassName
          )}
        >
          Pisto
        </span>
      ) : null}
    </span>
  );
}
