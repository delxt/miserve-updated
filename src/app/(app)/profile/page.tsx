import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { activeDepartments } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [[me], departments] = await Promise.all([
    db
      .select({
        fullName: schema.users.fullName,
        email: schema.users.email,
        phone: schema.users.phone,
        idNumber: schema.users.idNumber,
        departmentId: schema.users.departmentId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1),
    activeDepartments(),
  ]);
  return (
    <>
      <PageHeader title="My profile" description={me.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
            <CardDescription>Used on your requests so MIS staff can reach you.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              me={{ ...me, departmentId: me.departmentId ? String(me.departmentId) : "" }}
              departments={departments}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Other devices will be signed out.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
