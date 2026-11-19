import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  canAssign,
  canComment,
  canRate,
  canTransition,
  canView,
  statusAfterAssign,
  ticketCode,
  type Actor,
  type TicketRef,
} from "./workflow";

const admin: Actor = { id: "a", role: "admin" };
const tech: Actor = { id: "t", role: "technician" };
const otherTech: Actor = { id: "t2", role: "technician" };
const req: Actor = { id: "r", role: "requester" };
const stranger: Actor = { id: "x", role: "requester" };

const t = (over: Partial<TicketRef> = {}): TicketRef => ({
  status: "pending",
  requesterId: "r",
  assignedToId: null,
  ...over,
});

describe("visibility", () => {
  it("requesters see only their own tickets", () => {
    expect(canView(req, t())).toBe(true);
    expect(canView(stranger, t())).toBe(false);
  });
  it("staff see every ticket", () => {
    expect(canView(tech, t())).toBe(true);
    expect(canView(admin, t())).toBe(true);
  });
});

describe("transitions", () => {
  it("requester can cancel a pending ticket but not start it", () => {
    expect(allowedTransitions(req, t())).toEqual(["cancelled"]);
  });
  it("requester can confirm or reopen a resolved ticket", () => {
    expect(allowedTransitions(req, t({ status: "resolved", assignedToId: "t" }))).toEqual([
      "in_progress",
      "closed",
    ]);
  });
  it("requester cannot change a ticket in progress", () => {
    expect(allowedTransitions(req, t({ status: "in_progress", assignedToId: "t" }))).toEqual([]);
  });
  it("assigned technician can work the ticket", () => {
    const ref = t({ status: "assigned", assignedToId: "t" });
    expect(canTransition(tech, ref, "in_progress")).toBe(true);
    expect(canTransition(otherTech, ref, "in_progress")).toBe(false);
  });
  it("in progress can be resolved but not closed directly", () => {
    const ref = t({ status: "in_progress", assignedToId: "t" });
    expect(canTransition(tech, ref, "resolved")).toBe(true);
    expect(canTransition(tech, ref, "closed")).toBe(false);
  });
  it("unassigned pending ticket cannot go straight to in progress", () => {
    expect(canTransition(admin, t(), "in_progress")).toBe(false);
    expect(canTransition(admin, t(), "cancelled")).toBe(true);
  });
  it("closed and cancelled tickets are final", () => {
    expect(allowedTransitions(admin, t({ status: "closed" }))).toEqual([]);
    expect(allowedTransitions(admin, t({ status: "cancelled" }))).toEqual([]);
  });
});

describe("assignment", () => {
  it("admin can assign anyone on an open ticket", () => {
    expect(canAssign(admin, t(), "t2")).toBe(true);
    expect(canAssign(admin, t({ status: "closed" }), "t2")).toBe(false);
  });
  it("technician can only take unassigned tickets for themselves", () => {
    expect(canAssign(tech, t(), "t")).toBe(true);
    expect(canAssign(tech, t(), "t2")).toBe(false);
    expect(canAssign(tech, t({ assignedToId: "t2", status: "assigned" }), "t")).toBe(false);
  });
  it("requesters cannot assign", () => {
    expect(canAssign(req, t(), "r")).toBe(false);
  });
  it("assignment moves pending to assigned and back", () => {
    expect(statusAfterAssign("pending", "t")).toBe("assigned");
    expect(statusAfterAssign("assigned", null)).toBe("pending");
    expect(statusAfterAssign("in_progress", "t2")).toBe("in_progress");
  });
});

describe("comments and rating", () => {
  it("requester cannot comment on a closed ticket, staff can", () => {
    expect(canComment(req, t({ status: "closed" }))).toBe(false);
    expect(canComment(tech, t({ status: "closed" }))).toBe(true);
  });
  it("only the requester rates, once, after resolution", () => {
    expect(canRate(req, { ...t({ status: "resolved" }), rating: null })).toBe(true);
    expect(canRate(req, { ...t({ status: "resolved" }), rating: 4 })).toBe(false);
    expect(canRate(req, { ...t({ status: "in_progress" }), rating: null })).toBe(false);
    expect(canRate(tech, { ...t({ status: "resolved" }), rating: null })).toBe(false);
  });
});

it("formats ticket codes", () => {
  expect(ticketCode(42, new Date("2026-03-01"))).toBe("MIS-2026-00042");
});
