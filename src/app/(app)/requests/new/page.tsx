import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { activeCategories, activeDepartments } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewRequestForm } from "./new-request-form";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage() {
  const user = await requireUser();
  const [categories, departments, [me]] = await Promise.all([
    activeCategories(),
    activeDepartments(),
    db
      .select({ phone: schema.users.phone, departmentId: schema.users.departmentId })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1),
  ]);
  return (
    <>
      <PageHeader
        title="Request MIS support"
        description="Tell us what is wrong. The MIS office will review it and assign a technician."
      />
      <Card>
        <CardContent>
          <NewRequestForm
            categories={categories}
            departments={departments}
            defaults={{ phone: me?.phone ?? "", departmentId: me?.departmentId ? String(me.departmentId) : "" }}
          />
        </CardContent>
      </Card>
    </>
  );
}
