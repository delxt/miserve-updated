import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { recentTickets, statusCounts, type TicketScope } from "@/lib/queries";
import { OPEN_STATUSES, STATUS_LABELS, isStaff, type Status } from "@/lib/workflow";
import { fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

const CARD_STATUSES: Status[] = ["pending", "assigned", "in_progress", "on_hold", "resolved", "closed"];

async function StatGrid({ counts, scope }: { counts: Record<Status, number>; scope: TicketScope }) {
  const open = OPEN_STATUSES.reduce((n, s) => n + counts[s], 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <Link href={`/requests?scope=${scope}&status=open`} className="col-span-2 sm:col-span-3 lg:col-span-1">
        <Card className="h-full gap-1 border-primary/30 bg-primary text-primary-foreground transition-opacity hover:opacity-95">
          <CardContent>
            <p className="text-xs opacity-80">Open</p>
            <p className="text-3xl font-semibold">{open}</p>
          </CardContent>
        </Card>
      </Link>
      {CARD_STATUSES.map((s) => (
        <Link key={s} href={`/requests?scope=${scope}&status=${s}`}>
          <Card className="h-full gap-1 transition-colors hover:border-primary/40">
            <CardContent>
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-semibold">{counts[s]}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

async function RecentList({
  title,
  description,
  rows,
  href,
  showRequester,
}: {
  title: string;
  description: string;
  rows: Awaited<ReturnType<typeof recentTickets>>;
  href: string;
  showRequester?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={href}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
        {rows.map((t) => (
          <Link
            key={t.code}
            href={`/requests/${t.code}`}
            className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 hover:text-primary sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="w-32 shrink-0 text-xs text-muted-foreground">{t.code}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
            {showRequester && (
              <span className="hidden w-40 truncate text-sm text-muted-foreground md:block">{t.requesterName}</span>
            )}
            <span className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </span>
            <span className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground lg:block">
              {fmtDateTime(t.createdAt)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const staff = isStaff(user.role);
  const first = user.fullName.split(" ")[0];

  if (!staff) {
    const [counts, recent] = await Promise.all([statusCounts(user, "mine"), recentTickets(user, "mine")]);
    return (
      <>
        <PageHeader title={`Hello, ${first}`} description="Here is the status of your MIS support requests.">
          <Button asChild>
            <Link href="/requests/new">
              <PlusIcon /> New request
            </Link>
          </Button>
        </PageHeader>
        <div className="flex flex-col gap-6">
          <StatGrid counts={counts} scope="mine" />
          <RecentList
            title="My recent requests"
            description="Most recently updated first."
            rows={recent}
            href="/requests?scope=mine"
          />
        </div>
      </>
    );
  }

  const [allCounts, mine, unassigned, assigned] = await Promise.all([
    statusCounts(user, "all"),
    statusCounts(user, "assigned"),
    recentTickets(user, "unassigned"),
    recentTickets(user, "assigned"),
  ]);
  const myOpen = OPEN_STATUSES.reduce((n, s) => n + mine[s], 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        description={`You have ${myOpen} open request${myOpen === 1 ? "" : "s"} assigned to you.`}
      >
        <Button variant="outline" asChild>
          <Link href="/requests?scope=unassigned">Unassigned queue</Link>
        </Button>
        <Button asChild>
          <Link href="/requests/new">
            <PlusIcon /> New request
          </Link>
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-6">
        <StatGrid counts={allCounts} scope="all" />
        <div className="grid gap-6 xl:grid-cols-2">
          <RecentList
            title="Waiting for a technician"
            description="Open requests nobody has taken yet."
            rows={unassigned}
            href="/requests?scope=unassigned"
            showRequester
          />
          <RecentList
            title="Assigned to me"
            description="Your requests, most recently updated first."
            rows={assigned}
            href="/requests?scope=assigned"
            showRequester
          />
        </div>
      </div>
    </>
  );
}
