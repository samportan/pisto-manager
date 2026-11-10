import { cn } from "@/lib/utils";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-muted/70 p-0.5",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-md px-3 text-sm font-medium transition-[color,background-color,box-shadow] duration-150",
              selected
                ? "bg-card text-foreground shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
