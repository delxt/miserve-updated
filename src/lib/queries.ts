import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { CurrentUser } from "./auth";
import { OPEN_STATUSES, STATUSES, isStaff, type Status } from "./workflow";

const { tickets, users, categories, departments, ticketEvents, attachments } = schema;
const requester = alias(users, "requester");
const assignee = alias(users, "assignee");

export const PAGE_SIZE = 20;

export type TicketScope = "mine" | "assigned" | "unassigned" | "all";

export interface TicketFilters {
  scope?: TicketScope;
  status?: string;
  categoryId?: number;
  departmentId?: number;
  q?: string;
  page?: number;
}

function scopeCondition(user: CurrentUser, scope: TicketScope): SQL | undefined {
  // Requesters only ever see their own tickets, whatever the URL says.
  if (!isStaff(user.role) || scope === "mine") return eq(tickets.requesterId, user.id);
  if (scope === "assigned") return eq(tickets.assignedToId, user.id);
  if (scope === "unassigned") return and(isNull(tickets.assignedToId), inArray(tickets.status, OPEN_STATUSES));
  return undefined;
}

export async function listTickets(user: CurrentUser, f: TicketFilters) {
  const scope = f.scope ?? (isStaff(user.role) ? "all" : "mine");
  const conds: (SQL | undefined)[] = [scopeCondition(user, scope)];
  if (f.status === "open") conds.push(inArray(tickets.status, OPEN_STATUSES));
  else if (f.status && (STATUSES as readonly string[]).includes(f.status))
    conds.push(eq(tickets.status, f.status as Status));
  if (f.categoryId) conds.push(eq(tickets.categoryId, f.categoryId));
  if (f.departmentId) conds.push(eq(tickets.departmentId, f.departmentId));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(tickets.code, like), ilike(tickets.subject, like), ilike(requester.fullName, like)));
  }
  const where = and(...conds);
  const page = Math.max(1, f.page ?? 1);

  const [rows, total] = await Promise.all([
    db
      .select({
        id: tickets.id,
        code: tickets.code,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        category: categories.name,
        department: departments.name,
        requesterName: requester.fullName,
        assigneeName: assignee.fullName,
      })
      .from(tickets)
      .innerJoin(requester, eq(tickets.requesterId, requester.id))
      .leftJoin(assignee, eq(tickets.assignedToId, assignee.id))
      .innerJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(departments, eq(tickets.departmentId, departments.id))
      .where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(tickets)
      .innerJoin(requester, eq(tickets.requesterId, requester.id))
      .where(where)
      .then((r) => r[0]?.n ?? 0),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), scope };
}

export async function getTicketByCode(code: string) {
  const rows = await db
    .select({
      ticket: tickets,
      category: categories.name,
      department: departments.name,
      requesterName: requester.fullName,
      requesterEmail: requester.email,
      requesterPhone: requester.phone,
      requesterIdNumber: requester.idNumber,
      requesterType: requester.requesterType,
      assigneeName: assignee.fullName,
    })
    .from(tickets)
    .innerJoin(requester, eq(tickets.requesterId, requester.id))
    .leftJoin(assignee, eq(tickets.assignedToId, assignee.id))
    .innerJoin(categories, eq(tickets.categoryId, categories.id))
    .leftJoin(departments, eq(tickets.departmentId, departments.id))
    .where(eq(tickets.code, code))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTicketTimeline(ticketId: number, includeInternal: boolean) {
  const actor = alias(users, "actor");
  const conds = [eq(ticketEvents.ticketId, ticketId)];
  if (!includeInternal) conds.push(eq(ticketEvents.internal, false));
  const [events, files] = await Promise.all([
    db
      .select({
        id: ticketEvents.id,
        type: ticketEvents.type,
        body: ticketEvents.body,
        fromStatus: ticketEvents.fromStatus,
        toStatus: ticketEvents.toStatus,
        internal: ticketEvents.internal,
        createdAt: ticketEvents.createdAt,
        actorName: actor.fullName,
        actorRole: actor.role,
      })
      .from(ticketEvents)
      .innerJoin(actor, eq(ticketEvents.actorId, actor.id))
      .where(and(...conds))
      .orderBy(asc(ticketEvents.createdAt), asc(ticketEvents.id)),
    db
      .select({
        id: attachments.id,
        fileName: attachments.fileName,
        size: attachments.size,
        mimeType: attachments.mimeType,
        createdAt: attachments.createdAt,
        uploaderName: users.fullName,
      })
      .from(attachments)
      .innerJoin(users, eq(attachments.uploaderId, users.id))
      .where(eq(attachments.ticketId, ticketId))
      .orderBy(asc(attachments.createdAt)),
  ]);
  return { events, files };
}

export function activeCategories() {
  return db
    .select({ id: categories.id, name: categories.name, description: categories.description })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.name));
}

export function activeDepartments() {
  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.active, true))
    .orderBy(asc(departments.name));
}

export function staffUsers() {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(and(inArray(users.role, ["technician", "admin"]), eq(users.active, true)))
    .orderBy(asc(users.fullName));
}

export async function statusCounts(user: CurrentUser, scope: TicketScope) {
  const rows = await db
    .select({ status: tickets.status, n: count() })
    .from(tickets)
    .where(scopeCondition(user, scope))
    .groupBy(tickets.status);
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function recentTickets(user: CurrentUser, scope: TicketScope, limit = 6) {
  return db
    .select({
      code: tickets.code,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      requesterName: requester.fullName,
    })
    .from(tickets)
    .innerJoin(requester, eq(tickets.requesterId, requester.id))
    .where(scopeCondition(user, scope))
    .orderBy(desc(tickets.updatedAt))
    .limit(limit);
}

export interface ReportRange {
  from: Date;
  to: Date; // exclusive
}

export async function reportSummary({ from, to }: ReportRange) {
  const inRange = and(gte(tickets.createdAt, from), lt(tickets.createdAt, to));
  const hours = sql<number>`avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600)`;

  const [byStatus, byCategory, byDepartment, byMonth, byTech, totals] = await Promise.all([
    db.select({ key: tickets.status, n: count() }).from(tickets).where(inRange).groupBy(tickets.status),
    db
      .select({ key: categories.name, n: count() })
      .from(tickets)
      .innerJoin(categories, eq(tickets.categoryId, categories.id))
      .where(inRange)
      .groupBy(categories.name)
      .orderBy(desc(count())),
    db
      .select({ key: sql<string>`coalesce(${departments.name}, 'No office')`, n: count() })
      .from(tickets)
      .leftJoin(departments, eq(tickets.departmentId, departments.id))
      .where(inRange)
      .groupBy(departments.name)
      .orderBy(desc(count())),
    db
      .select({ key: sql<string>`to_char(${tickets.createdAt}, 'YYYY-MM')`, n: count() })
      .from(tickets)
      .where(inRange)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        key: assignee.fullName,
        n: count(),
        resolved: sql<number>`count(*) filter (where ${tickets.status} in ('resolved','closed'))`,
        avgHours: hours,
        avgRating: sql<number>`avg(${tickets.rating})`,
      })
      .from(tickets)
      .innerJoin(assignee, eq(tickets.assignedToId, assignee.id))
      .where(inRange)
      .groupBy(assignee.fullName)
      .orderBy(desc(count())),
    db
      .select({
        total: count(),
        resolved: sql<number>`count(*) filter (where ${tickets.status} in ('resolved','closed'))`,
        avgHours: hours,
        avgRating: sql<number>`avg(${tickets.rating})`,
        rated: sql<number>`count(${tickets.rating})`,
      })
      .from(tickets)
      .where(inRange)
      .then((r) => r[0]),
  ]);
  return { byStatus, byCategory, byDepartment, byMonth, byTech, totals };
}

export async function reportRows({ from, to }: ReportRange) {
  return db
    .select({
      code: tickets.code,
      createdAt: tickets.createdAt,
      subject: tickets.subject,
      category: categories.name,
      department: departments.name,
      requester: requester.fullName,
      priority: tickets.priority,
      status: tickets.status,
      assignee: assignee.fullName,
      resolvedAt: tickets.resolvedAt,
      closedAt: tickets.closedAt,
      rating: tickets.rating,
      feedback: tickets.feedback,
    })
    .from(tickets)
    .innerJoin(requester, eq(tickets.requesterId, requester.id))
    .leftJoin(assignee, eq(tickets.assignedToId, assignee.id))
    .innerJoin(categories, eq(tickets.categoryId, categories.id))
    .leftJoin(departments, eq(tickets.departmentId, departments.id))
    .where(and(gte(tickets.createdAt, from), lt(tickets.createdAt, to)))
    .orderBy(asc(tickets.createdAt));
}
