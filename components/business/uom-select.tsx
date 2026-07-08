"use client";

import { NativeSelect } from "@/components/ui/select-native";
import { useT } from "@/hooks/useTranslations";
import { UNIT_OF_MEASURE_VALUES, type UnitOfMeasure } from "@/lib/uom";
import { cn } from "@/lib/utils";

type Props = {
  value: UnitOfMeasure;
  onChange: (value: UnitOfMeasure) => void;
  id?: string;
  className?: string;
};

export function UomSelect({ value, onChange, id, className }: Props) {
  const { t } = useT();
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as UnitOfMeasure)}
      className={cn(className)}
    >
      {UNIT_OF_MEASURE_VALUES.map((uom) => (
        <option key={uom} value={uom}>
          {t(`business.uom.${uom}`)}
        </option>
      ))}
    </NativeSelect>
  );
}
