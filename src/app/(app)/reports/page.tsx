import type { Metadata } from "next";
import { DownloadIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { reportSummary } from "@/lib/queries";
import { parseRange } from "@/lib/report-range";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/workflow";
import { fmtHours } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Reports" };

function BarList({ rows, empty = "No requests in this period." }: { rows: { key: string; n: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{r.key}</span>
            <span className="font-medium">{r.n}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireUser(["technician", "admin"]);
  const sp = await searchParams;
  const range = parseRange(one(sp.from), one(sp.to));
  const data = await reportSummary(range);
  const t = data.totals;
  const statusMap = Object.fromEntries(data.byStatus.map((r) => [r.key, r.n])) as Partial<Record<Status, number>>;
  const resolvedPct = t && t.total ? Math.round((Number(t.resolved) / t.total) * 100) : 0;

  return (
    <>
      <PageHeader title="Reports" description="Summary of MIS support requests filed in the selected period.">
        <Button variant="outline" asChild>
          <a href={`/api/reports/export?from=${range.fromStr}&to=${range.toStr}`}>
            <DownloadIcon /> Export CSV
          </a>
        </Button>
      </PageHeader>

      <Card className="mb-6 py-4">
        <CardContent className="px-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={range.fromStr} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={range.toStr} />
            </div>
            <Button type="submit" variant="secondary">
              Show report
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Requests filed", value: String(t?.total ?? 0) },
          { label: "Resolved or closed", value: `${t?.resolved ?? 0} (${resolvedPct}%)` },
          { label: "Average time to resolve", value: fmtHours(t?.avgHours) },
          {
            label: "Average rating",
            value: t?.avgRating ? `${Number(t.avgRating).toFixed(1)} / 5 (${t.rated})` : "—",
          },
        ].map((s) => (
          <Card key={s.label} className="gap-1">
            <CardContent>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={STATUSES.filter((s) => statusMap[s]).map((s) => ({ key: STATUS_LABELS[s], n: statusMap[s]! }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byCategory} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By office</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byDepartment} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By month</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byMonth} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Technician performance</CardTitle>
          <CardDescription>Requests assigned in this period.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Technician</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Avg. time to resolve</TableHead>
                <TableHead className="pr-6">Avg. rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byTech.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No assigned requests in this period.
                  </TableCell>
                </TableRow>
              )}
              {data.byTech.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="pl-6 font-medium">{r.key}</TableCell>
                  <TableCell>{r.n}</TableCell>
                  <TableCell>{r.resolved}</TableCell>
                  <TableCell>{fmtHours(r.avgHours)}</TableCell>
                  <TableCell className="pr-6">{r.avgRating ? Number(r.avgRating).toFixed(1) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
