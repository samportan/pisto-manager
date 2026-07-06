import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PendingLabelProps = {
  label: string;
  className?: string;
  spinnerClassName?: string;
};

export function PendingLabel({ label, className, spinnerClassName }: PendingLabelProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Spinner className={spinnerClassName} />
      {label}
    </span>
  );
}
