"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hashPassword, requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const { users, departments, categories, sessions } = schema;

const userSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["requester", "technician", "admin"]),
  requesterType: z.enum(["student", "faculty", "staff", ""]).optional(),
  idNumber: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(30).optional(),
  departmentId: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, v.email)).limit(1);
  if (exists) return { error: "An account with this email already exists." };
  await db.insert(users).values({
    fullName: v.fullName,
    email: v.email,
    role: v.role,
    requesterType: v.requesterType ? v.requesterType : null,
    idNumber: v.idNumber || null,
    phone: v.phone || null,
    departmentId: v.departmentId ? Number(v.departmentId) : null,
    passwordHash: await hashPassword(v.password),
  });
  revalidatePath("/admin/users");
  return { ok: `Account created for ${v.fullName}.` };
}

const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["requester", "technician", "admin"]),
  departmentId: z.string().optional(),
  active: z.enum(["true", "false"]),
});

export async function updateUser(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser(["admin"]);
  const parsed = updateUserSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid input." };
  const v = parsed.data;
  if (v.id === me.id && (v.role !== "admin" || v.active === "false")) {
    return { error: "You cannot remove your own admin access." };
  }
  await db
    .update(users)
    .set({
      role: v.role,
      departmentId: v.departmentId ? Number(v.departmentId) : null,
      active: v.active === "true",
    })
    .where(eq(users.id, v.id));
  if (v.active === "false") await db.delete(sessions).where(eq(sessions.userId, v.id));
  revalidatePath("/admin/users");
  return { ok: "User updated." };
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const id = z.string().uuid().safeParse(form.get("id"));
  const pw = z.string().min(8).safeParse(form.get("password"));
  if (!id.success) return { error: "Invalid user." };
  if (!pw.success) return { error: "Password must be at least 8 characters." };
  await db.update(users).set({ passwordHash: await hashPassword(pw.data) }).where(eq(users.id, id.data));
  await db.delete(sessions).where(eq(sessions.userId, id.data));
  return { ok: "Password reset. The user must sign in again." };
}

const lookupSchema = z.object({
  kind: z.enum(["department", "category"]),
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a name.").max(120),
  extra: z.string().trim().max(300).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export async function saveLookup(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const parsed = lookupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const id = v.id ? Number(v.id) : null;
  const active = v.active ? v.active === "true" : true;

  if (v.kind === "department") {
    const [dup] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(id ? and(eq(departments.name, v.name), ne(departments.id, id)) : eq(departments.name, v.name))
      .limit(1);
    if (dup) return { error: "That office already exists." };
    if (id) await db.update(departments).set({ name: v.name, code: v.extra || null, active }).where(eq(departments.id, id));
    else await db.insert(departments).values({ name: v.name, code: v.extra || null });
    revalidatePath("/admin/departments");
  } else {
    const [dup] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(id ? and(eq(categories.name, v.name), ne(categories.id, id)) : eq(categories.name, v.name))
      .limit(1);
    if (dup) return { error: "That category already exists." };
    if (id)
      await db
        .update(categories)
        .set({ name: v.name, description: v.extra || null, active })
        .where(eq(categories.id, id));
    else await db.insert(categories).values({ name: v.name, description: v.extra || null });
    revalidatePath("/admin/categories");
  }
  return { ok: id ? "Saved." : "Added." };
}
