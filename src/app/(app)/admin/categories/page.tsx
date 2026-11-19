import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LookupManager } from "@/components/lookup-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireUser(["admin"]);
  const { categories, tickets } = schema;
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      extra: categories.description,
      active: categories.active,
      uses: count(tickets.id),
    })
    .from(categories)
    .leftJoin(tickets, eq(tickets.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return (
    <>
      <PageHeader title="Request categories" description="The kinds of problems people can report." />
      <LookupManager kind="category" rows={rows} extraLabel="Hint shown on the request form" noun="category" />
    </>
  );
}
