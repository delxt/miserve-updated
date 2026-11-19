"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hashPassword, requireUser, revokeOtherSessions, verifyPassword } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().trim().max(30).optional(),
  idNumber: z.string().trim().max(40).optional(),
  departmentId: z.string().optional(),
});

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  await db
    .update(schema.users)
    .set({
      fullName: v.fullName,
      phone: v.phone || null,
      idNumber: v.idNumber || null,
      departmentId: v.departmentId ? Number(v.departmentId) : null,
    })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

const pwSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    password: z.string().min(8, "New password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match." });

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = pwSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [row] = await db
    .select({ hash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  if (!row || !(await verifyPassword(parsed.data.current, row.hash))) {
    return { error: "Your current password is wrong." };
  }
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(schema.users.id, user.id));
  await revokeOtherSessions(user.id);
  return { ok: "Password changed. Other devices were signed out." };
}
