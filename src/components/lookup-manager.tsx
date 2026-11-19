"use client";

import { useActionState, useRef } from "react";
import { saveLookup } from "@/app/actions/admin";
import { SubmitButton, useActionToast } from "@/components/form-bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { id: number; name: string; extra: string | null; active: boolean; uses: number };

function RowForm({ kind, row, extraLabel }: { kind: "department" | "category"; row: Row; extraLabel: string }) {
  const [state, action] = useActionState(saveLookup, undefined);
  useActionToast(state);
  return (
    <form action={action} className="grid gap-2 py-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={row.id} />
      <Input name="name" defaultValue={row.name} aria-label="Name" required />
      <Input name="extra" defaultValue={row.extra ?? ""} aria-label={extraLabel} placeholder={extraLabel} />
      <div className="flex items-center gap-2">
        <select
          name="active"
          defaultValue={String(row.active)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Visible"
        >
          <option value="true">Active</option>
          <option value="false">Hidden</option>
        </select>
        <Badge variant="outline" title="Requests using this">
          {row.uses}
        </Badge>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export function LookupManager({
  kind,
  rows,
  extraLabel,
  noun,
}: {
  kind: "department" | "category";
  rows: Row[];
  extraLabel: string;
  noun: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(saveLookup, undefined);
  useActionToast(state, ref);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add {noun}</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={ref} action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <input type="hidden" name="kind" value={kind} />
            <div className="grid gap-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-extra">{extraLabel}</Label>
              <Input id="new-extra" name="extra" />
            </div>
            <SubmitButton pendingText="Adding…">Add</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {noun === "office" ? "offices" : "categories"}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {rows.map((r) => (
            <RowForm key={r.id} kind={kind} row={r} extraLabel={extraLabel} />
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Hidden items stay on old requests but can no longer be picked on new ones. The number shows how many requests use
        each item.
      </p>
    </div>
  );
}
