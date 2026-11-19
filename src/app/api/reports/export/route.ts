import { getCurrentUser } from "@/lib/auth";
import { reportRows } from "@/lib/queries";
import { csvEscape, parseRange } from "@/lib/report-range";
import { isStaff } from "@/lib/workflow";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const rows = await reportRows(range);

  const header = [
    "Code",
    "Filed",
    "Subject",
    "Category",
    "Office",
    "Requester",
    "Priority",
    "Status",
    "Technician",
    "Resolved",
    "Closed",
    "Rating",
    "Feedback",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.code,
        r.createdAt,
        r.subject,
        r.category,
        r.department,
        r.requester,
        r.priority,
        r.status,
        r.assignee,
        r.resolvedAt,
        r.closedAt,
        r.rating,
        r.feedback,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  // BOM so Excel opens it as UTF-8
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miserve-report-${range.fromStr}-to-${range.toStr}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
