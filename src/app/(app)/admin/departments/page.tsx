import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LookupManager } from "@/components/lookup-manager";

export const metadata: Metadata = { title: "Offices" };

export default async function DepartmentsPage() {
  await requireUser(["admin"]);
  const { departments, tickets } = schema;
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      extra: departments.code,
      active: departments.active,
      uses: count(tickets.id),
    })
    .from(departments)
    .leftJoin(tickets, eq(tickets.departmentId, departments.id))
    .groupBy(departments.id)
    .orderBy(asc(departments.name));
  return (
    <>
      <PageHeader title="Offices & departments" description="Shown on the registration and request forms." />
      <LookupManager kind="department" rows={rows} extraLabel="Short code (optional)" noun="office" />
    </>
  );
}
