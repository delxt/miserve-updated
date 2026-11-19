"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3Icon,
  Building2Icon,
  FolderTreeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MenuIcon,
  PlusCircleIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/workflow";

type Item = { href: string; label: string; icon: React.ElementType; roles?: Role[]; match?: (p: string, s: URLSearchParams) => boolean };

const SECTIONS: { title?: string; roles?: Role[]; items: Item[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
      { href: "/requests/new", label: "New Request", icon: PlusCircleIcon },
      {
        href: "/requests?scope=mine",
        label: "My Requests",
        icon: InboxIcon,
        match: (p, s) => p === "/requests" && (s.get("scope") === "mine" || !s.get("scope")),
      },
    ],
  },
  {
    title: "MIS Office",
    roles: ["technician", "admin"],
    items: [
      {
        href: "/requests?scope=all",
        label: "All Requests",
        icon: ListChecksIcon,
        match: (p, s) => p === "/requests" && ["all", "assigned", "unassigned"].includes(s.get("scope") ?? ""),
      },
      { href: "/reports", label: "Reports", icon: BarChart3Icon },
    ],
  },
  {
    title: "Administration",
    roles: ["admin"],
    items: [
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/departments", label: "Offices", icon: Building2Icon },
      { href: "/admin/categories", label: "Categories", icon: FolderTreeIcon },
    ],
  },
  { items: [{ href: "/profile", label: "My Profile", icon: UserCogIcon }] },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <nav className="flex flex-col gap-5">
      {SECTIONS.filter((s) => !s.roles || s.roles.includes(role)).map((section, i) => (
        <div key={i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = item.match
              ? item.match(pathname, search)
              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function SidebarNav({ role }: { role: Role }) {
  return <NavLinks role={role} />;
}

export function MobileNav({ role }: { role: Role }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="px-0">
          <SheetTitle>MIServe</SheetTitle>
        </SheetHeader>
        <NavLinks role={role} />
      </SheetContent>
    </Sheet>
  );
}
