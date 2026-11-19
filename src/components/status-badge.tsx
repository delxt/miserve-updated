import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from "@/lib/workflow";

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  assigned: "bg-sky-50 text-sky-800 border-sky-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  on_hold: "bg-orange-50 text-orange-800 border-orange-200",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-zinc-50 text-zinc-600 border-zinc-200",
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  high: "bg-orange-50 text-orange-800 border-orange-200",
  urgent: "bg-red-600 text-white border-red-600",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLE[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant="outline" className={cn(PRIORITY_STYLE[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
