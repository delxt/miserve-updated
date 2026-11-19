"use client";

import { useActionState, useRef } from "react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { SubmitButton, useActionToast } from "@/components/form-bits";
import { FormSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  me,
  departments,
}: {
  me: { fullName: string; phone: string | null; idNumber: string | null; departmentId: string };
  departments: { id: number; name: string }[];
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  useActionToast(state);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={me.fullName} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="idNumber">ID number</Label>
          <Input id="idNumber" name="idNumber" defaultValue={me.idNumber ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={me.phone ?? ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="departmentId">Office / department</Label>
        <FormSelect
          id="departmentId"
          name="departmentId"
          defaultValue={me.departmentId}
          options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
        />
      </div>
      <SubmitButton className="w-fit" pendingText="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(changePassword, undefined);
  useActionToast(state, ref);
  return (
    <form ref={ref} action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <SubmitButton className="w-fit" pendingText="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}
