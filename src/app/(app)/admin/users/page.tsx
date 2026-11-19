import type { Metadata } from "next";
import { asc, eq, ilike, or } from "drizzle-orm";
import { SearchIcon } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { activeDepartments } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateUserDialog, EditUserDialog } from "./user-dialogs";

export const metadata: Metadata = { title: "Users" };

const ROLE_LABEL = { requester: "Requester", technician: "Technician", admin: "Admin" } as const;

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireUser(["admin"]);
  const qRaw = (await searchParams).q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.trim().slice(0, 100);
  const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const { users, departments } = schema;

  const [rows, depts] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        requesterType: users.requesterType,
        idNumber: users.idNumber,
        active: users.active,
        createdAt: users.createdAt,
        departmentId: users.departmentId,
        department: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(like ? or(ilike(users.fullName, like), ilike(users.email, like), ilike(users.idNumber, like)) : undefined)
      .orderBy(asc(users.fullName))
      .limit(200),
    activeDepartments(),
  ]);

  return (
    <>
      <PageHeader title="Users" description="Requesters, MIS technicians and administrators.">
        <CreateUserDialog departments={depts} />
      </PageHeader>
      <Card className="mb-4 py-4">
        <CardContent className="px-4">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="Search name, email or ID number" className="pl-9" />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead className="hidden md:table-cell">Office</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              <TableHead className="pr-4 text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="pl-4">
                  <span className="block font-medium">{u.fullName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {u.email}
                    {u.idNumber ? ` · ${u.idNumber}` : ""}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{u.department ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "requester" ? "outline" : "secondary"}>{ROLE_LABEL[u.role]}</Badge>
                  {u.requesterType && (
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{u.requesterType}</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {u.active ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      Deactivated
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{fmtDate(u.createdAt)}</TableCell>
                <TableCell className="pr-4 text-right">
                  <EditUserDialog user={u} departments={depts} isMe={u.id === me.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
