import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page or request you are looking for does not exist, or you do not have access to it.
      </p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
