import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PaperclipIcon, StarIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTicketByCode, getTicketTimeline, staffUsers } from "@/lib/queries";
import {
  STATUS_LABELS,
  allowedTransitions,
  canAssign,
  canComment,
  canRate,
  canView,
  isStaff,
} from "@/lib/workflow";
import { fmtBytes, fmtDateTime, initials } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreatedToast } from "./created-toast";
import { AssignForm, CommentForm, PriorityForm, RatingForm, StatusActions } from "./ticket-forms";

export async function generateMetadata({ params }: PageProps<"/requests/[code]">): Promise<Metadata> {
  return { title: (await params).code };
}

const TYPE_TEXT = {
  created: "submitted the request",
  comment: "replied",
  status_change: "changed the status",
  assignment: "updated the assignment",
  rating: "rated the service",
} as const;

export default async function TicketPage({ params, searchParams }: PageProps<"/requests/[code]">) {
  const user = await requireUser();
  const { code } = await params;
  const created = (await searchParams).created === "1";
  const row = await getTicketByCode(code);
  if (!row || !canView(user, row.ticket)) notFound();
  const t = row.ticket;
  const staff = isStaff(user.role);

  const [{ events, files }, staffList] = await Promise.all([
    getTicketTimeline(t.id, staff),
    staff ? staffUsers() : Promise.resolve([]),
  ]);
  const moves = allowedTransitions(user, t);
  const showAssign = staff && canAssign(user, t, user.id);

  return (
    <div className="flex flex-col gap-6">
      {created && <CreatedToast code={t.code!} />}
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/requests">
            <ArrowLeftIcon /> Back to requests
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.code}</span>
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
          <Badge variant="outline">{row.category}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.subject}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Problem description</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.description}</p>
              {files.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Attachments</p>
                    <ul className="flex flex-col gap-1">
                      {files.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 text-sm">
                          <PaperclipIcon className="size-4 text-muted-foreground" />
                          <a href={`/api/attachments/${f.id}`} className="truncate text-primary hover:underline">
                            {f.fileName}
                          </a>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {fmtBytes(f.size)} · {f.uploaderName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-5">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback
                        className={
                          e.actorRole === "requester" ? "bg-muted text-xs" : "bg-primary/10 text-xs text-primary"
                        }
                      >
                        {initials(e.actorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{e.actorName}</span>{" "}
                        <span className="text-muted-foreground">{TYPE_TEXT[e.type]}</span>
                        {e.internal && (
                          <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-800">
                            Internal note
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</p>
                      {e.type === "status_change" && e.fromStatus && e.toStatus && (
                        <p className="mt-1 text-sm">
                          {STATUS_LABELS[e.fromStatus]} → <span className="font-medium">{STATUS_LABELS[e.toStatus]}</span>
                        </p>
                      )}
                      {e.body && (
                        <div
                          className={
                            e.type === "comment"
                              ? `mt-2 whitespace-pre-wrap rounded-lg border p-3 text-sm ${e.internal ? "border-amber-200 bg-amber-50/60" : "bg-muted/40"}`
                              : "mt-1 whitespace-pre-wrap text-sm text-muted-foreground"
                          }
                        >
                          {e.body}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {canComment(user, t) && (
                <>
                  <Separator className="my-6" />
                  <CommentForm code={t.code!} staff={staff} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          {(moves.length > 0 || showAssign || staff) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {moves.length > 0 && (
                  <StatusActions code={t.code!} moves={moves} current={t.status} isRequester={t.requesterId === user.id && !staff} />
                )}
                {showAssign && (
                  <AssignForm
                    code={t.code!}
                    current={t.assignedToId}
                    me={user.id}
                    isAdmin={user.role === "admin"}
                    staff={staffList}
                  />
                )}
                {staff && <PriorityForm code={t.code!} current={t.priority} />}
              </CardContent>
            </Card>
          )}

          {canRate(user, t) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How did we do?</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingForm code={t.code!} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Requester</dt>
                <dd>
                  {row.requesterName}
                  {row.requesterType && (
                    <span className="block text-xs capitalize text-muted-foreground">
                      {row.requesterType}
                      {row.requesterIdNumber ? ` · ${row.requesterIdNumber}` : ""}
                    </span>
                  )}
                </dd>
                {staff && (
                  <>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate">{row.requesterEmail}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Contact</dt>
                <dd>{t.contactNumber || row.requesterPhone || "—"}</dd>
                <dt className="text-muted-foreground">Office</dt>
                <dd>{row.department ?? "—"}</dd>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{t.location || "—"}</dd>
                <dt className="text-muted-foreground">Technician</dt>
                <dd>{row.assigneeName ?? "Not yet assigned"}</dd>
                <dt className="text-muted-foreground">Filed</dt>
                <dd>{fmtDateTime(t.createdAt)}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{fmtDateTime(t.updatedAt)}</dd>
                {t.resolvedAt && (
                  <>
                    <dt className="text-muted-foreground">Resolved</dt>
                    <dd>{fmtDateTime(t.resolvedAt)}</dd>
                  </>
                )}
                {t.closedAt && (
                  <>
                    <dt className="text-muted-foreground">{t.status === "cancelled" ? "Cancelled" : "Closed"}</dt>
                    <dd>{fmtDateTime(t.closedAt)}</dd>
                  </>
                )}
                {t.rating !== null && (
                  <>
                    <dt className="text-muted-foreground">Rating</dt>
                    <dd className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <StarIcon
                          key={i}
                          className={`size-4 ${i < t.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
