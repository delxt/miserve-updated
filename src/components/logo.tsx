import { LifeBuoyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LifeBuoyIcon className="size-4" />
      </span>
      <span className="leading-tight">
        MIServe
        <span className="block text-[11px] font-normal text-muted-foreground">Request MIS Support</span>
      </span>
    </span>
  );
}
