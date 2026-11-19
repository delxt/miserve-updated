"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { pickFiles, saveFile } from "@/lib/uploads";
import {
  PRIORITIES,
  STATUSES,
  STATUS_LABELS,
  canAssign,
  canComment,
  canRate,
  canTransition,
  canView,
  isStaff,
  statusAfterAssign,
  ticketCode,
  type Status,
} from "@/lib/workflow";

const { tickets, ticketEvents, attachments, users } = schema;

async function loadTicket(user: CurrentUser, code: string) {
  const [t] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!t || !canView(user, t)) return null;
  return t;
}

async function storeFiles(ticketId: number, uploaderId: string, files: File[]) {
  for (const file of files) {
    const storagePath = await saveFile(ticketId, file);
    await db.insert(attachments).values({
      ticketId,
      uploaderId,
      fileName: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      storagePath,
    });
  }
}

const newTicketSchema = z.object({
  categoryId: z.coerce.number().int().positive("Choose a category."),
  departmentId: z.coerce.number().int().positive("Choose your office or department."),
  subject: z.string().trim().min(4, "Write a short subject.").max(150),
  description: z.string().trim().min(10, "Describe the problem in a bit more detail.").max(5000),
  location: z.string().trim().max(150).optional(),
  contactNumber: z.string().trim().max(30).optional(),
  priority: z.enum(PRIORITIES).default("normal"),
});

export async function createTicket(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = newTicketSchema.safeParse({
    categoryId: form.get("categoryId"),
    departmentId: form.get("departmentId"),
    subject: form.get("subject"),
    description: form.get("description"),
    location: form.get("location") || undefined,
    contactNumber: form.get("contactNumber") || undefined,
    priority: form.get("priority") || "normal",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { files, error } = pickFiles(form);
  if (error) return { error };
  const v = parsed.data;

  const code = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tickets)
      .values({
        requesterId: user.id,
        categoryId: v.categoryId,
        departmentId: v.departmentId,
        subject: v.subject,
        description: v.description,
        location: v.location || null,
        contactNumber: v.contactNumber || null,
        // Only MIS staff may file a ticket as high or urgent on someone's behalf;
        // requesters can still flag it and staff adjust it later.
        priority: v.priority,
      })
      .returning({ id: tickets.id, createdAt: tickets.createdAt });
    const code = ticketCode(row.id, row.createdAt);
    await tx.update(tickets).set({ code }).where(eq(tickets.id, row.id));
    await tx.insert(ticketEvents).values({
      ticketId: row.id,
      actorId: user.id,
      type: "created",
      toStatus: "pending",
    });
    return { code, id: row.id };
  });

  await storeFiles(code.id, user.id, files);
  revalidatePath("/requests");
  redirect(`/requests/${code.code}?created=1`);
}

const commentSchema = z.object({
  code: z.string(),
  body: z.string().trim().max(5000),
  internal: z.string().optional(),
});

export async function addComment(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid comment." };
  const t = await loadTicket(user, parsed.data.code);
  if (!t) return { error: "Request not found." };
  if (!canComment(user, t)) return { error: "This request is closed for replies." };
  const { files, error } = pickFiles(form);
  if (error) return { error };
  if (!parsed.data.body && files.length === 0) return { error: "Write a message or attach a file." };

  const internal = isStaff(user.role) && parsed.data.internal === "on";
  if (parsed.data.body || files.length) {
    await db.insert(ticketEvents).values({
      ticketId: t.id,
      actorId: user.id,
      type: "comment",
      body: parsed.data.body || (files.length ? `Attached ${files.length} file(s).` : ""),
      internal,
    });
  }
  await storeFiles(t.id, user.id, files);
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, t.id));
  revalidatePath(`/requests/${t.code}`);
  return { ok: "Reply posted." };
}

export async function changeStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const code = String(form.get("code") ?? "");
  const to = String(form.get("status") ?? "") as Status;
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  if (!(STATUSES as readonly string[]).includes(to)) return { error: "Unknown status." };
  const t = await loadTicket(user, code);
  if (!t) return { error: "Request not found." };
  if (!canTransition(user, t, to)) return { error: "You cannot make that change." };
  if ((to === "on_hold" || to === "cancelled") && !note && isStaff(user.role)) {
    return { error: "Please give a reason." };
  }

  const now = new Date();
  // Re-check the status in the WHERE so two people clicking at once can't both win.
  const updated = await db
    .update(tickets)
    .set({
      status: to,
      updatedAt: now,
      resolvedAt: to === "resolved" ? now : to === "in_progress" ? null : t.resolvedAt,
      closedAt: to === "closed" || to === "cancelled" ? now : null,
    })
    .where(and(eq(tickets.id, t.id), eq(tickets.status, t.status)))
    .returning({ id: tickets.id });
  if (!updated.length) return { error: "This request was just changed by someone else. Reload and try again." };

  await db.insert(ticketEvents).values({
    ticketId: t.id,
    actorId: user.id,
    type: "status_change",
    fromStatus: t.status,
    toStatus: to,
    body: note || null,
  });
  revalidatePath(`/requests/${t.code}`);
  return { ok: `Status changed to ${STATUS_LABELS[to]}.` };
}

export async function assignTicket(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["technician", "admin"]);
  const code = String(form.get("code") ?? "");
  const raw = String(form.get("assigneeId") ?? "");
  const assigneeId = raw === "" || raw === "none" ? null : raw;
  const t = await loadTicket(user, code);
  if (!t) return { error: "Request not found." };
  if (!canAssign(user, t, assigneeId)) return { error: "You cannot assign this request." };
  if (assigneeId === t.assignedToId) return { ok: "No change." };

  let assigneeName = "nobody";
  if (assigneeId) {
    const [a] = await db
      .select({ fullName: users.fullName, role: users.role, active: users.active })
      .from(users)
      .where(eq(users.id, assigneeId))
      .limit(1);
    if (!a || !a.active || a.role === "requester") return { error: "Choose an active MIS staff member." };
    assigneeName = a.fullName;
  }
  const status = statusAfterAssign(t.status, assigneeId);
  const updated = await db
    .update(tickets)
    .set({ assignedToId: assigneeId, status, updatedAt: new Date() })
    .where(and(eq(tickets.id, t.id), eq(tickets.status, t.status)))
    .returning({ id: tickets.id });
  if (!updated.length) return { error: "This request was just changed by someone else. Reload and try again." };
  await db.insert(ticketEvents).values({
    ticketId: t.id,
    actorId: user.id,
    type: "assignment",
    body: assigneeId ? `Assigned to ${assigneeName}` : "Unassigned",
    fromStatus: t.status !== status ? t.status : null,
    toStatus: t.status !== status ? status : null,
  });
  revalidatePath(`/requests/${t.code}`);
  return { ok: assigneeId ? `Assigned to ${assigneeName}.` : "Unassigned." };
}

export async function setPriority(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["technician", "admin"]);
  const code = String(form.get("code") ?? "");
  const p = z.enum(PRIORITIES).safeParse(form.get("priority"));
  if (!p.success) return { error: "Unknown priority." };
  const t = await loadTicket(user, code);
  if (!t) return { error: "Request not found." };
  if (t.priority === p.data) return { ok: "No change." };
  await db.update(tickets).set({ priority: p.data, updatedAt: new Date() }).where(eq(tickets.id, t.id));
  await db.insert(ticketEvents).values({
    ticketId: t.id,
    actorId: user.id,
    type: "comment",
    body: `Priority changed from ${t.priority} to ${p.data}.`,
    internal: false,
  });
  revalidatePath(`/requests/${t.code}`);
  return { ok: "Priority updated." };
}

const rateSchema = z.object({
  code: z.string(),
  rating: z.coerce.number().int().min(1, "Choose 1 to 5 stars.").max(5),
  feedback: z.string().trim().max(2000).optional(),
});

export async function rateTicket(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = await loadTicket(user, parsed.data.code);
  if (!t) return { error: "Request not found." };
  if (!canRate(user, t)) return { error: "You cannot rate this request." };
  await db
    .update(tickets)
    .set({ rating: parsed.data.rating, feedback: parsed.data.feedback || null, updatedAt: new Date() })
    .where(eq(tickets.id, t.id));
  await db.insert(ticketEvents).values({
    ticketId: t.id,
    actorId: user.id,
    type: "rating",
    body: `Rated ${parsed.data.rating}/5${parsed.data.feedback ? `: ${parsed.data.feedback}` : ""}`,
  });
  revalidatePath(`/requests/${t.code}`);
  return { ok: "Thank you for your feedback!" };
}
