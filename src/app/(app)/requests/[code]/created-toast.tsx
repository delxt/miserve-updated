"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreatedToast({ code }: { code: string }) {
  const router = useRouter();
  useEffect(() => {
    toast.success(`Request ${code} submitted. The MIS office will get back to you.`);
    router.replace(`/requests/${code}`, { scroll: false });
  }, [code, router]);
  return null;
}
