// Seeds offices, categories and the first admin account.
// Usage: npm run db:seed            (random admin password, printed once)
//        SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

const DEPARTMENTS = [
  ["Office of the Campus Director", "OCD"],
  ["Administrative Office", "ADMIN"],
  ["Registrar's Office", "REG"],
  ["Accounting Office", "ACCT"],
  ["Cashier's Office", "CASH"],
  ["Library", "LIB"],
  ["Guidance Office", "GUID"],
  ["Student Affairs", "OSA"],
  ["Research and Extension", "RDE"],
  ["MIS Office", "MIS"],
  ["College of Teacher Education", "CTE"],
  ["College of Business and Management", "CBM"],
  ["College of Fisheries and Marine Sciences", "CFMS"],
  ["College of Sciences", "COS"],
  ["College of Technology and Allied Sciences", "CTAS"],
] as const;

const CATEGORIES = [
  ["Hardware", "Computer, monitor, keyboard, mouse or UPS not working."],
  ["Software / Application", "Installing, updating or fixing programs."],
  ["Network / Internet", "No connection, slow Wi-Fi, LAN cable or access point problems."],
  ["Account / Password", "Password resets, locked accounts, portal or system access."],
  ["Email", "School email setup, sending or receiving problems."],
  ["Printer / Scanner", "Printer setup, sharing, jams, toner or scanning."],
  ["Website / Information System", "Problems with the school website or an office system."],
  ["CCTV / Audio-Visual", "Projector, sound system, CCTV or event technical support."],
  ["Other", "Anything else the MIS office can help with."],
] as const;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  for (const [name, code] of DEPARTMENTS) {
    await db.insert(schema.departments).values({ name, code }).onConflictDoNothing();
  }
  for (const [name, description] of CATEGORIES) {
    await db.insert(schema.categories).values({ name, description }).onConflictDoNothing();
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@miserve.local").toLowerCase();
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    console.log(`Admin ${email} already exists; left unchanged.`);
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    const [mis] = await db
      .select({ id: schema.departments.id })
      .from(schema.departments)
      .where(eq(schema.departments.code, "MIS"));
    await db.insert(schema.users).values({
      email,
      fullName: "MIS Administrator",
      role: "admin",
      requesterType: "staff",
      departmentId: mis?.id ?? null,
      passwordHash: await bcrypt.hash(password, 10),
    });
    console.log("Admin account created:");
    console.log(`  email:    ${email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) console.log(`  password: ${password}   (shown once - change it after signing in)`);
  }
  await pool.end();
  console.log("Seed done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
