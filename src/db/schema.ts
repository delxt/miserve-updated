import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["requester", "technician", "admin"]);
export const requesterType = pgEnum("requester_type", ["student", "faculty", "staff"]);
export const ticketStatus = pgEnum("ticket_status", [
  "pending",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "cancelled",
]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);
export const eventType = pgEnum("event_type", [
  "created",
  "comment",
  "status_change",
  "assignment",
  "rating",
]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRole("role").notNull().default("requester"),
  requesterType: requesterType("requester_type"),
  idNumber: text("id_number"),
  phone: text("phone"),
  departmentId: integer("department_id").references(() => departments.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    code: text("code").unique(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    departmentId: integer("department_id").references(() => departments.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    location: text("location"),
    contactNumber: text("contact_number"),
    priority: ticketPriority("priority").notNull().default("normal"),
    status: ticketStatus("status").notNull().default("pending"),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    rating: integer("rating"),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("tickets_requester_idx").on(t.requesterId),
    index("tickets_assigned_idx").on(t.assignedToId),
    index("tickets_status_idx").on(t.status),
  ],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    type: eventType("type").notNull(),
    body: text("body"),
    fromStatus: ticketStatus("from_status"),
    toStatus: ticketStatus("to_status"),
    // internal notes are visible to MIS staff only
    internal: boolean("internal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_events_ticket_idx").on(t.ticketId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_ticket_idx").on(t.ticketId)],
);

export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketStatus = (typeof ticketStatus.enumValues)[number];
export type TicketPriority = (typeof ticketPriority.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
