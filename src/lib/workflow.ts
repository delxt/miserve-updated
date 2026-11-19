// Pure ticket rules: who may see and change a ticket, and which status moves are allowed.
// No database or Next.js imports here, so it is easy to unit test.

export const STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Role = "requester" | "technician" | "admin";

export const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const OPEN_STATUSES: Status[] = ["pending", "assigned", "in_progress", "on_hold"];

export interface Actor {
  id: string;
  role: Role;
}

export interface TicketRef {
  status: Status;
  requesterId: string;
  assignedToId: string | null;
}

export function isStaff(role: Role) {
  return role === "technician" || role === "admin";
}

export function canView(actor: Actor, t: TicketRef) {
  return isStaff(actor.role) || t.requesterId === actor.id;
}

/** Status moves MIS staff may make. */
const STAFF_MOVES: Record<Status, Status[]> = {
  pending: ["in_progress", "cancelled"],
  assigned: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "resolved"],
  on_hold: ["in_progress", "resolved"],
  resolved: ["in_progress", "closed"],
  closed: [],
  cancelled: [],
};

/** Status moves the requester may make on their own ticket. */
const REQUESTER_MOVES: Record<Status, Status[]> = {
  pending: ["cancelled"],
  assigned: ["cancelled"],
  in_progress: [],
  on_hold: [],
  resolved: ["closed", "in_progress"], // confirm fix, or reopen
  closed: [],
  cancelled: [],
};

/** Which statuses this actor may move the ticket to right now. */
export function allowedTransitions(actor: Actor, t: TicketRef): Status[] {
  const moves = new Set<Status>();
  if (actor.role === "admin") {
    STAFF_MOVES[t.status].forEach((s) => moves.add(s));
  } else if (actor.role === "technician" && t.assignedToId === actor.id) {
    STAFF_MOVES[t.status].forEach((s) => moves.add(s));
  }
  if (t.requesterId === actor.id) {
    REQUESTER_MOVES[t.status].forEach((s) => moves.add(s));
  }
  // A technician can only start work on a ticket that is assigned to someone.
  if (moves.has("in_progress") && t.status === "pending" && !t.assignedToId) {
    moves.delete("in_progress");
  }
  return STATUSES.filter((s) => moves.has(s));
}

export function canTransition(actor: Actor, t: TicketRef, to: Status) {
  return allowedTransitions(actor, t).includes(to);
}

/** Admins assign anyone; a technician may take an unassigned open ticket for themselves. */
export function canAssign(actor: Actor, t: TicketRef, assigneeId: string | null) {
  if (!OPEN_STATUSES.includes(t.status)) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "technician") {
    return assigneeId === actor.id && (t.assignedToId === null || t.assignedToId === actor.id);
  }
  return false;
}

/** Status after an assignment change. */
export function statusAfterAssign(current: Status, assigneeId: string | null): Status {
  if (assigneeId === null) return current === "assigned" ? "pending" : current;
  return current === "pending" ? "assigned" : current;
}

export function canComment(actor: Actor, t: TicketRef) {
  if (!canView(actor, t)) return false;
  if (t.status === "closed" || t.status === "cancelled") return isStaff(actor.role);
  return true;
}

export function canRate(actor: Actor, t: TicketRef & { rating: number | null }) {
  return (
    t.requesterId === actor.id &&
    (t.status === "resolved" || t.status === "closed") &&
    t.rating === null
  );
}

export function canEditPriority(actor: Actor) {
  return isStaff(actor.role);
}

export function ticketCode(id: number, createdAt: Date) {
  return `MIS-${createdAt.getFullYear()}-${String(id).padStart(5, "0")}`;
}
