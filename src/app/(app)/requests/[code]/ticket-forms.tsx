"use client";

import { useActionState, useRef, useState } from "react";
import { StarIcon } from "lucide-react";
import { addComment, assignTicket, changeStatus, rateTicket, setPriority } from "@/app/actions/tickets";
import { SubmitButton, useActionToast, withToast } from "@/components/form-bits";
import { FormSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export function CommentForm({ code, staff }: { code: string; staff: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addComment, undefined);
  useActionToast(state, ref);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="code" value={code} />
      <Label htmlFor="body">Add a reply</Label>
      <Textarea
        id="body"
        name="body"
        rows={3}
        maxLength={5000}
        placeholder={staff ? "Reply to the requester, or write an internal note" : "Add more details or answer the MIS staff"}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Input name="attachments" type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" className="max-w-64" />
          {staff && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="internal" /> Internal note (MIS only)
            </label>
          )}
        </div>
        <SubmitButton pendingText="Posting…">Post reply</SubmitButton>
      </div>
    </form>
  );
}

const MOVE_LABEL: Partial<Record<Status, string>> = {
  in_progress: "Start work",
  on_hold: "Put on hold",
  resolved: "Mark as resolved",
  closed: "Close request",
  cancelled: "Cancel request",
};

const REQUESTER_LABEL: Partial<Record<Status, string>> = {
  closed: "Yes, it's fixed — close it",
  in_progress: "Not fixed — reopen",
  cancelled: "Cancel my request",
};

export function StatusActions({
  code,
  moves,
  current,
  isRequester,
}: {
  code: string;
  moves: Status[];
  current: Status;
  isRequester: boolean;
}) {
  const [target, setTarget] = useState<Status | null>(null);
  const [, action] = useActionState(
    withToast(changeStatus, () => setTarget(null)),
    undefined,
  );

  const label = (s: Status) =>
    (isRequester ? REQUESTER_LABEL[s] : undefined) ??
    (current === "resolved" && s === "in_progress" ? "Reopen" : MOVE_LABEL[s]) ??
    STATUS_LABELS[s];
  const needsReason = (s: Status) => !isRequester && (s === "on_hold" || s === "cancelled");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Status</p>
      {moves.map((s) => (
        <Button
          key={s}
          variant={s === "cancelled" ? "outline" : s === "resolved" || s === "closed" ? "default" : "secondary"}
          className={cn("w-full justify-start", s === "cancelled" && "text-destructive")}
          onClick={() => setTarget(s)}
        >
          {label(s)}
        </Button>
      ))}
      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          {target && (
            <form action={action} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{label(target)}</DialogTitle>
                <DialogDescription>
                  {STATUS_LABELS[current]} → {STATUS_LABELS[target]}
                </DialogDescription>
              </DialogHeader>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="status" value={target} />
              <div className="grid gap-2">
                <Label htmlFor="note">{needsReason(target) ? "Reason" : "Note (optional)"}</Label>
                <Textarea
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={2000}
                  required={needsReason(target)}
                  placeholder={
                    target === "resolved" ? "What was done to fix it?" : needsReason(target) ? "Why?" : ""
                  }
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                  Back
                </Button>
                <SubmitButton pendingText="Saving…">Confirm</SubmitButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AssignForm({
  code,
  current,
  me,
  isAdmin,
  staff,
}: {
  code: string;
  current: string | null;
  me: string;
  isAdmin: boolean;
  staff: { id: string; fullName: string; role: string }[];
}) {
  const [, action] = useActionState(withToast(assignTicket), undefined);

  if (!isAdmin) {
    if (current === me) return <p className="text-sm text-muted-foreground">This request is assigned to you.</p>;
    return (
      <form action={action}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="assigneeId" value={me} />
        <SubmitButton variant="secondary" className="w-full" pendingText="Assigning…">
          Assign to me
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <Label htmlFor="assigneeId">Technician</Label>
      <FormSelect
        id="assigneeId"
        name="assigneeId"
        defaultValue={current ?? "none"}
        options={[
          { value: "none", label: "Unassigned" },
          ...staff.map((s) => ({ value: s.id, label: s.id === me ? `${s.fullName} (me)` : s.fullName })),
        ]}
      />
      <SubmitButton variant="secondary" pendingText="Saving…">
        Save assignment
      </SubmitButton>
    </form>
  );
}

export function PriorityForm({ code, current }: { code: string; current: Priority }) {
  const [state, action] = useActionState(setPriority, undefined);
  useActionToast(state);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <Label htmlFor="priority">Priority</Label>
      <FormSelect
        id="priority"
        name="priority"
        defaultValue={current}
        options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
      />
      <SubmitButton variant="secondary" pendingText="Saving…">
        Save priority
      </SubmitButton>
    </form>
  );
}

export function RatingForm({ code }: { code: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [, action] = useActionState(withToast(rateTicket), undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
          >
            <StarIcon
              className={cn(
                "size-7 transition-colors",
                n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea name="feedback" rows={3} maxLength={2000} placeholder="Comments about the service (optional)" />
      <SubmitButton disabled={rating === 0} pendingText="Sending…">
        Send feedback
      </SubmitButton>
    </form>
  );
}
