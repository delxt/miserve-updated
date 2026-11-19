"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { FormError, SubmitButton, keepValuesOnSubmit } from "@/components/form-bits";
import { FormSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm({ departments }: { departments: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError state={state} />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="requesterType">I am a</Label>
        <FormSelect
          id="requesterType"
          name="requesterType"
          required
          options={[
            { value: "student", label: "Student" },
            { value: "faculty", label: "Faculty" },
            { value: "staff", label: "Staff / Employee" },
          ]}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="idNumber">ID number</Label>
        <Input id="idNumber" name="idNumber" required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="departmentId">Office / department</Label>
        <FormSelect
          id="departmentId"
          name="departmentId"
          required
          options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="phone">Mobile number (optional)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <SubmitButton pending={pending} pendingText="Creating account…" className="sm:col-span-2">
        Create account
      </SubmitButton>
    </form>
  );
}
