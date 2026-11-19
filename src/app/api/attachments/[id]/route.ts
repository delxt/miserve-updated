import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { absolutePath } from "@/lib/uploads";
import { canView } from "@/lib/workflow";

export async function GET(_req: Request, ctx: RouteContext<"/api/attachments/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ file: schema.attachments, ticket: schema.tickets })
    .from(schema.attachments)
    .innerJoin(schema.tickets, eq(schema.attachments.ticketId, schema.tickets.id))
    .where(eq(schema.attachments.id, id.data))
    .limit(1);
  if (!row || !canView(user, row.ticket)) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(absolutePath(row.file.storagePath));
    const inline = row.file.mimeType.startsWith("image/") || row.file.mimeType === "application/pdf";
    return new Response(data, {
      headers: {
        "Content-Type": row.file.mimeType,
        "Content-Length": String(data.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.file.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
