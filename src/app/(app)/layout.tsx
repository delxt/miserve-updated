import Link from "next/link";
import { Suspense } from "react";
import { LogOutIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { MobileNav, SidebarNav } from "@/components/app-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";

const ROLE_LABEL = { requester: "Requester", technician: "MIS Technician", admin: "Administrator" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 px-2">
          <Logo />
        </Link>
        <Suspense>
          <SidebarNav role={user.role} />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Suspense>
            <MobileNav role={user.role} />
          </Suspense>
          <Link href="/dashboard" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(user.fullName)}</AvatarFallback>
            </Avatar>
            <form action={logout}>
              <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
                <LogOutIcon />
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
