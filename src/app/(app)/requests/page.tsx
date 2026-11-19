import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { activeCategories, activeDepartments, listTickets, type TicketScope } from "@/lib/queries";
import { STATUSES, STATUS_LABELS, isStaff } from "@/lib/workflow";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Requests" };

const SCOPES: { value: TicketScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned to me" },
  { value: "mine", label: "Filed by me" },
];

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const user = await requireUser();
  const sp = await searchParams;
  const staff = isStaff(user.role);
  const scopeParam = one(sp.scope) as TicketScope | undefined;
  const filters = {
    scope: staff ? (scopeParam && SCOPES.some((s) => s.value === scopeParam) ? scopeParam : "all") : "mine",
    status: one(sp.status),
    categoryId: Number(one(sp.category)) || undefined,
    departmentId: Number(one(sp.department)) || undefined,
    q: one(sp.q)?.trim().slice(0, 100) || undefined,
    page: Number(one(sp.page)) || 1,
  } as const;

  const [result, categories, departments] = await Promise.all([
    listTickets(user, filters),
    activeCategories(),
    staff ? activeDepartments() : Promise.resolve([]),
  ]);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      scope: filters.scope,
      status: filters.status,
      category: filters.categoryId,
      department: filters.departmentId,
      q: filters.q,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/requests?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={staff ? "Support requests" : "My requests"}
        description={`${result.total} request${result.total === 1 ? "" : "s"} found`}
      >
        <Button asChild>
          <Link href="/requests/new">
            <PlusIcon /> New request
          </Link>
        </Button>
      </PageHeader>

      {staff && (
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-background p-1">
          {SCOPES.map((s) => (
            <Link
              key={s.value}
              href={qs({ scope: s.value, page: undefined })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                filters.scope === s.value ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      <Card className="py-4">
        <CardContent className="px-4">
          <form className="flex flex-col gap-2 md:flex-row md:items-center" action="/requests">
            <input type="hidden" name="scope" value={filters.scope} />
            <div className="relative flex-1">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder={staff ? "Search code, subject or requester" : "Search code or subject"}
                className="pl-9"
              />
            </div>
            <select name="status" defaultValue={filters.status ?? ""} className={selectClass} aria-label="Status">
              <option value="">Any status</option>
              <option value="open">Open (not finished)</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={filters.categoryId ?? ""}
              className={selectClass}
              aria-label="Category"
            >
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {staff && (
              <select
                name="department"
                defaultValue={filters.departmentId ?? ""}
                className={selectClass}
                aria-label="Office"
              >
                <option value="">Any office</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Code</TableHead>
              <TableHead>Subject</TableHead>
              {staff && <TableHead className="hidden md:table-cell">Requester</TableHead>}
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              {staff && <TableHead className="hidden xl:table-cell">Technician</TableHead>}
              <TableHead className="hidden pr-4 sm:table-cell">Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No requests match these filters.
                </TableCell>
              </TableRow>
            )}
            {result.rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="pl-4">
                  <Link href={`/requests/${t.code}`} className="font-medium text-primary hover:underline">
                    {t.code}
                  </Link>
                </TableCell>
                <TableCell className="max-w-64 truncate">
                  <Link href={`/requests/${t.code}`} className="hover:underline">
                    {t.subject}
                  </Link>
                </TableCell>
                {staff && (
                  <TableCell className="hidden md:table-cell">
                    <span className="block">{t.requesterName}</span>
                    <span className="block text-xs text-muted-foreground">{t.department ?? "—"}</span>
                  </TableCell>
                )}
                <TableCell className="hidden lg:table-cell">{t.category}</TableCell>
                <TableCell>
                  <PriorityBadge priority={t.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                {staff && (
                  <TableCell className="hidden xl:table-cell">
                    {t.assigneeName ?? <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                )}
                <TableCell className="hidden pr-4 text-xs text-muted-foreground sm:table-cell">
                  {fmtDateTime(t.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {result.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {result.page} of {result.pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={result.page <= 1} asChild={result.page > 1}>
              {result.page > 1 ? <Link href={qs({ page: result.page - 1 })}>Previous</Link> : <span>Previous</span>}
            </Button>
            <Button variant="outline" size="sm" disabled={result.page >= result.pages} asChild={result.page < result.pages}>
              {result.page < result.pages ? (
                <Link href={qs({ page: result.page + 1 })}>Next</Link>
              ) : (
                <span>Next</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
