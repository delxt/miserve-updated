"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Option = { value: string; label: string };

/** Watermelon Select that submits with a normal form (Radix renders a hidden native select). */
export function FormSelect({
  name,
  options,
  placeholder,
  defaultValue,
  required,
  id,
  className,
  onValueChange,
}: {
  name: string;
  options: Option[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  id?: string;
  className?: string;
  onValueChange?: (v: string) => void;
}) {
  return (
    <Select name={name} defaultValue={defaultValue || undefined} required={required} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder ?? "Choose…"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
