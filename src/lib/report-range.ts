/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (dates in Manila time). Defaults to the current month. */
export function parseRange(fromRaw?: string | null, toRaw?: string | null) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const now = new Date();
  const manila = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = manila.getFullYear();
  const m = String(manila.getMonth() + 1).padStart(2, "0");
  const defFrom = `${y}-${m}-01`;
  const defTo = `${y}-${m}-${String(manila.getDate()).padStart(2, "0")}`;
  const fromStr = fromRaw && re.test(fromRaw) ? fromRaw : defFrom;
  let toStr = toRaw && re.test(toRaw) ? toRaw : defTo;
  if (toStr < fromStr) toStr = fromStr;
  const from = new Date(`${fromStr}T00:00:00+08:00`);
  const to = new Date(new Date(`${toStr}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000);
  return { from, to, fromStr, toStr };
}

export function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  // Stop spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
