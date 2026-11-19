"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { createUser, resetPassword, updateUser } from "@/app/actions/admin";
import { SubmitButton, keepValuesOnSubmit, useActionToast } from "@/components/form-bits";
import { FormSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Dept = { id: number; name: string };
const ROLES = [
  { value: "requester", label: "Requester" },
  { value: "technician", label: "MIS Technician" },
  { value: "admin", label: "Administrator" },
];

export function CreateUserDialog({ departments }: { departments: Dept[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof createUser>[0], form: FormData) => {
    const res = await createUser(prev, form);
    if (res?.ok) setOpen(false);
    return res;
  }, undefined);
  useActionToast(state, ref);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Create an account for a technician, administrator or requester.</DialogDescription>
        </DialogHeader>
        <form ref={ref} onSubmit={keepValuesOnSubmit(action)} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cu-name">Full name</Label>
            <Input id="cu-name" name="fullName" required />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-role">Role</Label>
            <FormSelect id="cu-role" name="role" defaultValue="technician" options={ROLES} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-type">Requester type</Label>
            <FormSelect
              id="cu-type"
              name="requesterType"
              options={[
                { value: "student", label: "Student" },
                { value: "faculty", label: "Faculty" },
                { value: "staff", label: "Staff" },
              ]}
              placeholder="(none)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-id">ID number</Label>
            <Input id="cu-id" name="idNumber" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-phone">Mobile</Label>
            <Input id="cu-phone" name="phone" type="tel" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cu-dept">Office</Label>
            <FormSelect
              id="cu-dept"
              name="departmentId"
              options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder="(none)"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cu-pw">Temporary password</Label>
            <Input id="cu-pw" name="password" type="text" minLength={8} required autoComplete="off" />
            <p className="text-xs text-muted-foreground">Share it with the user; they can change it in My Profile.</p>
          </div>
          <DialogFooter className="sm:col-span-2">
            <SubmitButton pending={pending} pendingText="Creating…">
              Create account
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  departments,
  isMe,
}: {
  user: { id: string; fullName: string; email: string; role: string; active: boolean; departmentId: number | null };
  departments: Dept[];
  isMe: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: Parameters<typeof updateUser>[0], form: FormData) => {
    const res = await updateUser(prev, form);
    if (res?.ok) setOpen(false);
    return res;
  }, undefined);
  const pwRef = useRef<HTMLFormElement>(null);
  const [pwState, pwAction] = useActionState(resetPassword, undefined);
  useActionToast(state);
  useActionToast(pwState, pwRef);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.fullName}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="id" value={user.id} />
          <div className="grid gap-2">
            <Label htmlFor={`role-${user.id}`}>Role</Label>
            <FormSelect id={`role-${user.id}`} name="role" defaultValue={user.role} options={ROLES} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`dept-${user.id}`}>Office</Label>
            <FormSelect
              id={`dept-${user.id}`}
              name="departmentId"
              defaultValue={user.departmentId ? String(user.departmentId) : undefined}
              options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder="(none)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`active-${user.id}`}>Account</Label>
            <FormSelect
              id={`active-${user.id}`}
              name="active"
              defaultValue={String(user.active)}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Deactivated (cannot sign in)" },
              ]}
            />
          </div>
          {isMe && <p className="text-xs text-muted-foreground">You cannot remove your own admin access.</p>}
          <DialogFooter>
            <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
          </DialogFooter>
        </form>
        <Separator />
        <form ref={pwRef} action={pwAction} className="grid gap-2">
          <input type="hidden" name="id" value={user.id} />
          <Label htmlFor={`pw-${user.id}`}>Reset password</Label>
          <div className="flex gap-2">
            <Input id={`pw-${user.id}`} name="password" type="text" minLength={8} required placeholder="New password" autoComplete="off" />
            <SubmitButton variant="secondary" pendingText="Resetting…">
              Reset
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
