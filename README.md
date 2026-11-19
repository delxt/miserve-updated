# MIServe – Request MIS Support

A rebuild of the MIServe MIS support request system using **Next.js 16** (App Router, server actions), **PostgreSQL** (via Drizzle ORM), **Watermelon UI** components (shadcn registry, Radix + Tailwind 4), and **Vitest** (Vite-powered tests).

## Features

> The original site only shows its title ("MIServe - Request MIS Support") to visitors who are not signed in. The feature list below is a v1 best guess at an MIS support system. It will be matched to the real system once screenshots of the signed-in pages are available.

- **Accounts:** self-registration for students, faculty and staff (ID number, office), sign in and out, profile, and password change. Changing the password signs out your other devices.
- **Roles:**
  - Requester: files and tracks their own requests.
  - MIS Technician: works the queue.
  - Administrator: manages everything.
- **Support requests:**
  - Each request has a category, office, subject, description, location, contact number, priority, and up to 5 attachments (10 MB each).
  - Requests get codes in the form `MIS-2026-00001`.
- **Workflow:** Pending → Assigned → In Progress → On Hold → Resolved → Closed (or Cancelled).
  - A technician can take an unassigned request. An admin can assign it to anyone.
  - The requester confirms the fix or reopens the request.
  - Moving a request to On Hold or Cancelled needs a reason.
- **Activity timeline:** replies with attachments, plus internal notes only MIS staff can see. Status, assignment, and priority changes are logged.
- **Feedback:** after resolution, the requester gives a 1–5 star rating and a comment.
- **Dashboards:**
  - Requesters see their own request counts.
  - Staff see the full queue, the unassigned list, and the requests assigned to them.
- **Requests list:** search, status, category, and office filters, plus "All / Unassigned / Assigned to me / Filed by me" tabs and pagination.
- **Reports:**
  - Totals, resolution rate, average time to resolve, and average rating.
  - Breakdowns by status, category, office, and month.
  - Technician performance.
  - CSV export.
- **Admin:**
  - Users: add accounts, change roles and offices, deactivate accounts, and reset passwords.
  - Offices and categories: add, rename, and hide.

## Setup (local)

1. **Create the database.** Run this once as the PostgreSQL superuser:
   ```
   psql -U postgres -f db-setup.local.sql
   ```
   `db-setup.local.sql` and `.env` were generated with a random password and are git-ignored. On another machine, copy `.env.example` to `.env` and create your own role and database.
2. Install packages and create the tables:
   ```
   npm install
   npm run db:migrate
   npm run db:seed
   ```
   The seed adds the offices, the categories, and an admin account `admin@miserve.local` with a random password. The password is printed once. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to choose your own.
3. Start the app:
   ```
   npm run dev
   ```
   Then open http://localhost:3012.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3012 |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest unit tests (workflow rules, report helpers) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run db:generate` | New SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed offices, categories, and the admin account |

## Layout

- `src/db/schema.ts`: tables (users, sessions, departments, categories, tickets, ticket_events, attachments)
- `src/lib/workflow.ts`: the rules for who can see, assign, and change a request (unit tested)
- `src/lib/auth.ts`: database-backed sessions (`miserve_session` cookie, bcrypt passwords)
- `src/app/actions/*`: server actions for every change
- `src/app/(app)/*`: signed-in pages; `src/app/(auth)/*`: login and register
- `src/components/ui/*`: Watermelon UI components (`@watermelon` registry in `components.json`)
- `storage/uploads/`: attachment files (git-ignored)
