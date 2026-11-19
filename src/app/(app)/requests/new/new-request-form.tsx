"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createTicket } from "@/app/actions/tickets";
import { FormError, SubmitButton } from "@/components/form-bits";
import { FormSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/workflow";

type Category = { id: number; name: string; description: string | null };

export function NewRequestForm({
  categories,
  departments,
  defaults,
}: {
  categories: Category[];
  departments: { id: number; name: string }[];
  defaults: { phone: string; departmentId: string };
}) {
  const [state, action] = useActionState(createTicket, undefined);
  const [categoryId, setCategoryId] = useState("");
  const hint = categories.find((c) => String(c.id) === categoryId)?.description;

  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <FormError state={state} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="categoryId">What kind of problem?</Label>
        <FormSelect
          id="categoryId"
          name="categoryId"
          required
          onValueChange={setCategoryId}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="departmentId">Office / department</Label>
        <FormSelect
          id="departmentId"
          name="departmentId"
          required
          defaultValue={defaults.departmentId}
          options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" maxLength={150} placeholder="e.g. No internet in Faculty Room 2" required />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="description">Describe the problem</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          maxLength={5000}
          placeholder="What happened, since when, and what you have already tried. Include any error message."
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location">Location (building / room)</Label>
        <Input id="location" name="location" maxLength={150} placeholder="e.g. Admin Bldg, Registrar's Office" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactNumber">Contact number</Label>
        <Input id="contactNumber" name="contactNumber" type="tel" maxLength={30} defaultValue={defaults.phone} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="priority">How urgent is it?</Label>
        <FormSelect
          id="priority"
          name="priority"
          defaultValue="normal"
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="attachments">Attachments (optional)</Label>
        <Input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
        />
        <p className="text-xs text-muted-foreground">Screenshots or documents. Up to 5 files, 10 MB each.</p>
      </div>
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="outline" asChild>
          <Link href="/requests">Cancel</Link>
        </Button>
        <SubmitButton pendingText="Submitting…">Submit request</SubmitButton>
      </div>
    </form>
  );
}
