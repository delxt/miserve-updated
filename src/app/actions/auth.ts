"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }
  if (!user.active) return { error: "This account is deactivated. Please contact the MIS office." };
  await createSession(user.id);
  redirect("/dashboard");
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    idNumber: z.string().trim().min(1, "Enter your ID number.").max(40),
    requesterType: z.enum(["student", "faculty", "staff"], { message: "Choose student, faculty or staff." }),
    departmentId: z.coerce.number().int().positive("Choose your office or department."),
    phone: z.string().trim().max(30).optional(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export async function register(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, v.email))
    .limit(1);
  if (existing.length) return { error: "An account with this email already exists." };
  const [user] = await db
    .insert(schema.users)
    .values({
      email: v.email,
      fullName: v.fullName,
      idNumber: v.idNumber,
      requesterType: v.requesterType,
      departmentId: v.departmentId,
      phone: v.phone || null,
      passwordHash: await hashPassword(v.password),
      role: "requester",
    })
    .returning({ id: schema.users.id });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
